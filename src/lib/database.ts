import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import log from './logger';

/**
 * Database schema interface for WhatsApp Chat Viewer
 */
interface ChatViewerDB extends DBSchema {
	chats: {
		key: string;
		value: {
			id: string;
			name: string;
			participants: string[];
			createdAt: Date;
			lastMessageAt: Date;
			messageCount: number;
			rawContent: string;
		};
		indexes: {
			'by-name': string;
			'by-lastMessage': Date;
			'by-createdAt': Date;
		};
	};
	messages: {
		key: string;
		value: {
			id: string;
			chatId: string;
			timestamp: Date;
			sender: string;
			content: string;
			messageIndex: number;
		};
		indexes: {
			'by-chat': string;
			'by-timestamp': Date;
			'by-sender': string;
			'by-chat-index': [string, number];
		};
	};
	bookmarks: {
		key: string;
		value: {
			id: string;
			messageId: string;
			chatId: string;
			createdAt: Date;
			note?: string;
		};
		indexes: {
			'by-chat': string;
			'by-createdAt': Date;
			'by-messageId': string;
		};
	};
}

/**
 * Database service class for managing WhatsApp chat data with enterprise-grade indexing
 */
class DatabaseService {
	private db: IDBPDatabase<ChatViewerDB> | null = null;
	private readonly DB_NAME = 'whatsapp-chat-viewer';
	private readonly DB_VERSION = 2;

	/**
	 * Initialize the database connection with optimized indexes
	 */
	async init(): Promise<void> {
		console.log('DB: Starting database initialization');
		log.info('Initializing database connection');
		
		try {
			// Add timeout to database initialization
			const dbPromise = openDB<ChatViewerDB>(this.DB_NAME, this.DB_VERSION, {
				upgrade(db, oldVersion, newVersion, transaction) {
					console.log('DB: Running database upgrade', { oldVersion, newVersion });
					
					if (oldVersion < 1) {
						// Chats store
						const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
						chatStore.createIndex('by-name', 'name');
						chatStore.createIndex('by-lastMessage', 'lastMessageAt');
						chatStore.createIndex('by-createdAt', 'createdAt');

						// Messages store with compound indexes for optimal querying
						const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
						messageStore.createIndex('by-chat', 'chatId');
						messageStore.createIndex('by-timestamp', 'timestamp');
						messageStore.createIndex('by-sender', 'sender');
						messageStore.createIndex('by-chat-index', ['chatId', 'messageIndex']);

						// Bookmarks store
						const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
						bookmarkStore.createIndex('by-chat', 'chatId');
						bookmarkStore.createIndex('by-createdAt', 'createdAt');
					}
					
					if (oldVersion < 2) {
						// Add messageId index to bookmarks for efficient lookups
						const bookmarkStore = transaction.objectStore('bookmarks');
						bookmarkStore.createIndex('by-messageId', 'messageId');
					}
				}
			});
			
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Database initialization timeout after 10 seconds')), 10000);
			});
			
			this.db = await Promise.race([dbPromise, timeoutPromise]);
			console.log('DB: Database initialization completed successfully');
			
		} catch (error) {
			console.error('DB: Database initialization failed:', error);
			console.error('DB: Error stack:', error instanceof Error ? error.stack : 'No stack available');
			throw error;
		}
		
		log.info('Database connection initialized');
	}

	/**
	 * Store a new chat with all its messages in a single optimized transaction
	 */
	async storeChat(
		id: string,
		name: string,
		participants: string[],
		messages: Array<{
			timestamp: Date;
			sender: string;
			content: string;
		}>,
		rawContent: string
	): Promise<void> {
		log.info('Storing new chat');
		if (!this.db) await this.init();

		const tx = this.db!.transaction(['chats', 'messages'], 'readwrite');

		try {
			// Store chat metadata
			const chat = {
				id,
				name,
				participants,
				createdAt: new Date(),
				lastMessageAt: messages.length > 0 ? messages[messages.length - 1].timestamp : new Date(),
				messageCount: messages.length,
				rawContent
			};

			await tx.objectStore('chats').put(chat);

			// Store messages one by one to avoid Promise.all issues
			const messageStore = tx.objectStore('messages');
			
			console.log('DB STORE: About to process', messages.length, 'messages sequentially');
			
			for (let i = 0; i < messages.length; i++) {
				console.log('DB STORE: Processing message', i + 1, 'of', messages.length);
				const message = messages[i];
				await messageStore.put({
					id: `${id}-${i}`,
					chatId: id,
					timestamp: message.timestamp,
					sender: message.sender,
					content: message.content,
					messageIndex: i
				});
			}
			
			console.log('DB STORE: All messages processed');

			// Ensure transaction is fully committed
			console.log('DB STORE: About to await tx.done');
			await tx.done;
			console.log('DB STORE: tx.done completed');
			log.info('Chat stored successfully');
		} catch (error) {
			log.error('Error storing chat:', error);
			// Transaction will auto-abort on error
			throw error;
		}
	}

	/**
	 * Get all chats sorted by last message date
	 */
	async getAllChats(): Promise<ChatViewerDB['chats']['value'][]> {
		log.info('Getting all chats');
		if (!this.db) await this.init();
		
		const chats = await this.db!.getAllFromIndex('chats', 'by-lastMessage');
		return chats.reverse(); // Most recent first
	}

	/**
	 * Get chat by ID
	 */
	async getChat(chatId: string): Promise<ChatViewerDB['chats']['value'] | undefined> {
		log.info('Getting chat by ID');
		if (!this.db) await this.init();
		return await this.db!.get('chats', chatId);
	}

	/**
	 * Get messages for a chat with pagination support
	 */
	async getMessages(
		chatId: string, 
		limit: number = 50, 
		offset: number = 0
	): Promise<ChatViewerDB['messages']['value'][]> {
		log.info('Getting messages for a chat with pagination');
		if (!this.db) await this.init();
		
		const tx = this.db!.transaction('messages', 'readonly');
		const index = tx.store.index('by-chat-index');
		
		// Use the compound index efficiently with proper range
		const range = IDBKeyRange.bound([chatId, offset], [chatId, Infinity]);
		let cursor = await index.openCursor(range);
		
		const messages: ChatViewerDB['messages']['value'][] = [];
		let count = 0;
		let iterations = 0;
		const MAX_ITERATIONS = 10000; // Safety limit to prevent infinite loops
		
		while (cursor && count < limit && iterations < MAX_ITERATIONS) {
			messages.push(cursor.value);
			count++;
			iterations++;
			cursor = await cursor.continue();
		}
		
		if (iterations >= MAX_ITERATIONS) {
			console.error('getMessages: Hit iteration limit, possible infinite loop detected');
		}
		
		return messages;
	}

	/**
	 * Get all messages for a chat (for searching/filtering)
	 */
	async getAllMessagesForChat(chatId: string): Promise<ChatViewerDB['messages']['value'][]> {
		console.log('DB: getAllMessagesForChat called with chatId:', chatId);
		log.info('Getting all messages for a chat');
		
		try {
			if (!this.db) {
				console.log('DB: Database not initialized, calling init()');
				await this.init();
			}
			
			console.log('DB: About to call getAllFromIndex');
			const result = await this.db!.getAllFromIndex('messages', 'by-chat', chatId);
			console.log('DB: getAllFromIndex completed, result count:', result.length);
			
			return result;
		} catch (error) {
			console.error('DB: Error in getAllMessagesForChat:', error);
			console.error('DB: Error stack:', error instanceof Error ? error.stack : 'No stack available');
			throw error;
		}
	}

	/**
	 * Add a bookmark to a message
	 */
	async addBookmark(messageId: string, chatId: string, note?: string): Promise<string> {
		log.info('Adding a bookmark');
		if (!this.db) await this.init();
		
		const bookmarkId = `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const bookmark = {
			id: bookmarkId,
			messageId,
			chatId,
			createdAt: new Date(),
			note
		};
		
		await this.db!.put('bookmarks', bookmark);
		return bookmarkId;
	}

	/**
	 * Remove a bookmark
	 */
	async removeBookmark(bookmarkId: string): Promise<void> {
		log.info('Removing a bookmark');
		if (!this.db) await this.init();
		await this.db!.delete('bookmarks', bookmarkId);
	}

	/**
	 * Get all bookmarks for a chat
	 */
	async getBookmarksForChat(chatId: string): Promise<ChatViewerDB['bookmarks']['value'][]> {
		log.info('Getting all bookmarks for a chat');
		if (!this.db) await this.init();
		return await this.db!.getAllFromIndex('bookmarks', 'by-chat', chatId);
	}

	/**
	 * Get all bookmarks across all chats
	 */
	async getAllBookmarks(): Promise<ChatViewerDB['bookmarks']['value'][]> {
		log.info('Getting all bookmarks');
		if (!this.db) await this.init();
		const bookmarks = await this.db!.getAllFromIndex('bookmarks', 'by-createdAt');
		return bookmarks.reverse(); // Most recent first
	}

	/**
	 * Check if a message is bookmarked
	 */
	async isMessageBookmarked(messageId: string): Promise<boolean> {
		log.info('Checking if a message is bookmarked');
		if (!this.db) await this.init();
		
		// Use the efficient index-based lookup
		const bookmark = await this.db!.getFromIndex('bookmarks', 'by-messageId', messageId);
		return bookmark !== undefined;
	}

	/**
	 * Get bookmark by message ID
	 */
	async getBookmarkByMessageId(messageId: string): Promise<ChatViewerDB['bookmarks']['value'] | undefined> {
		log.info('Getting bookmark by message ID');
		if (!this.db) await this.init();
		
		// Use the efficient index-based lookup
		return await this.db!.getFromIndex('bookmarks', 'by-messageId', messageId);
	}

	/**
	 * Search messages across all chats
	 */
	async searchMessages(query: string, chatId?: string): Promise<ChatViewerDB['messages']['value'][]> {
		log.info('Searching messages');
		if (!this.db) await this.init();
		
		const lowerQuery = query.toLowerCase();
		const results: ChatViewerDB['messages']['value'][] = [];
		
		const tx = this.db!.transaction('messages', 'readonly');
		const index = chatId ? tx.store.index('by-chat') : tx.store;
		const range = chatId ? IDBKeyRange.only(chatId) : undefined;
		
		let cursor = await index.openCursor(range);
		
		while (cursor) {
			if (cursor.value.content.toLowerCase().includes(lowerQuery) ||
				cursor.value.sender.toLowerCase().includes(lowerQuery)) {
				results.push(cursor.value);
			}
			cursor = await cursor.continue();
		}
		
		return results;
	}

	/**
	 * Delete a chat and all its messages
	 */
	async deleteChat(chatId: string): Promise<void> {
		log.info('Deleting a chat');
		if (!this.db) await this.init();
		
		const tx = this.db!.transaction(['chats', 'messages', 'bookmarks'], 'readwrite');
		
		// Delete chat
		await tx.objectStore('chats').delete(chatId);
		
		// Delete all messages for this chat
		const messages = await tx.objectStore('messages').index('by-chat').getAllKeys(chatId);
		for (const messageKey of messages) {
			await tx.objectStore('messages').delete(messageKey);
		}
		
		// Delete all bookmarks for this chat
		const bookmarks = await tx.objectStore('bookmarks').index('by-chat').getAllKeys(chatId);
		for (const bookmarkKey of bookmarks) {
			await tx.objectStore('bookmarks').delete(bookmarkKey);
		}
		
		await tx.done;
	}
}

// Export singleton instance
export const dbService = new DatabaseService();

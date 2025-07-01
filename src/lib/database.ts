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
		};
	};
}

/**
 * Database service class for managing WhatsApp chat data with enterprise-grade indexing
 */
class DatabaseService {
	private db: IDBPDatabase<ChatViewerDB> | null = null;
	private readonly DB_NAME = 'whatsapp-chat-viewer';
	private readonly DB_VERSION = 1;

	/**
	 * Initialize the database connection with optimized indexes
	 */
	async init(): Promise<void> {
		log.info('Initializing database connection');
		this.db = await openDB<ChatViewerDB>(this.DB_NAME, this.DB_VERSION, {
			upgrade(db) {
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
		});
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

		// Store messages with optimized batch insert
		const messageStore = tx.objectStore('messages');
		for (let i = 0; i < messages.length; i++) {
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

		await tx.done;
		log.info('Chat stored successfully');
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
		log.info('Getting messages for a chat');
		if (!this.db) await this.init();
		
		let cursor = await this.db!.transaction('messages').store
			.index('by-chat-index')
			.openCursor(IDBKeyRange.bound([chatId, offset], [chatId, offset + limit - 1]));
		
		const messages: ChatViewerDB['messages']['value'][] = [];
		while (cursor) {
			messages.push(cursor.value);
			cursor = await cursor.continue();
		}
		
		return messages;
	}

	/**
	 * Get all messages for a chat (for searching/filtering)
	 */
	async getAllMessagesForChat(chatId: string): Promise<ChatViewerDB['messages']['value'][]> {
		log.info('Getting all messages for a chat');
		if (!this.db) await this.init();
		return await this.db!.getAllFromIndex('messages', 'by-chat', chatId);
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
		
		const tx = this.db!.transaction('bookmarks', 'readonly');
		let cursor = await tx.store.openCursor();
		
		while (cursor) {
			if (cursor.value.messageId === messageId) {
				return true;
			}
			cursor = await cursor.continue();
		}
		
		return false;
	}

	/**
	 * Get bookmark by message ID
	 */
	async getBookmarkByMessageId(messageId: string): Promise<ChatViewerDB['bookmarks']['value'] | undefined> {
		log.info('Getting bookmark by message ID');
		if (!this.db) await this.init();
		
		const tx = this.db!.transaction('bookmarks', 'readonly');
		let cursor = await tx.store.openCursor();
		
		while (cursor) {
			if (cursor.value.messageId === messageId) {
				return cursor.value;
			}
			cursor = await cursor.continue();
		}
		
		return undefined;
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

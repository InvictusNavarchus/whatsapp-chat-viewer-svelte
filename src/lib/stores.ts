import { writable, derived, get } from 'svelte/store';
import { dbService } from './database.js';
import type { ParsedMessage } from './parser.js';
import log from './logger';

/**
 * Chat interface for the store
 */
export interface Chat {
	id: string;
	name: string;
	participants: string[];
	createdAt: Date;
	lastMessageAt: Date;
	messageCount: number;
	rawContent: string;
}

/**
 * Message interface for the store
 */
export interface Message {
	id: string;
	chatId: string;
	timestamp: Date;
	sender: string;
	content: string;
	messageIndex: number;
}

/**
 * Bookmark interface for the store
 */
export interface Bookmark {
	id: string;
	messageId: string;
	chatId: string;
	createdAt: Date;
	note?: string;
}

/**
 * Application state interface
 */
interface AppState {
	currentChatId: string | null;
	isLoading: boolean;
	searchQuery: string;
	showBookmarks: boolean;
	isMobile: boolean;
	isInitialized: boolean;
}

// Core stores
export const chats = writable<Chat[]>([]);
export const messages = writable<Message[]>([]);
export const bookmarks = writable<Bookmark[]>([]);
export const appState = writable<AppState>({
	currentChatId: null,
	isLoading: false,
	searchQuery: '',
	showBookmarks: false,
	isMobile: false,
	isInitialized: false
});

// Derived stores for optimized data access
export const currentChat = derived(
	[chats, appState],
	([$chats, $appState]) => {
		console.log('DERIVED STORE: currentChat called with chatId:', $appState.currentChatId);
		if (!$appState.currentChatId) return null;
		const found = $chats.find(chat => chat.id === $appState.currentChatId) || null;
		console.log('DERIVED STORE: currentChat returning:', found?.name || 'null');
		return found;
	}
);

export const filteredMessages = derived(
	[messages, appState],
	([$messages, $appState]) => {
		if (!$appState.searchQuery) return $messages;
		
		const query = $appState.searchQuery.toLowerCase();
		return $messages.filter(message => 
			message.content.toLowerCase().includes(query) ||
			message.sender.toLowerCase().includes(query)
		);
	}
);

export const currentChatBookmarks = derived(
	[bookmarks, appState],
	([$bookmarks, $appState]) => {
		if (!$appState.currentChatId) return [];
		return $bookmarks.filter(bookmark => bookmark.chatId === $appState.currentChatId);
	}
);

/**
 * Store management service with enterprise-grade caching and optimization
 */
class StoreService {
	private messageCache = new Map<string, Message[]>();
	private bookmarkCache = new Map<string, boolean>();
	private loadingStates = new Set<string>();
	private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();

	private readonly MAX_FAILURES = 3;
	private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

	/**
	 * Initialize the store service and load initial data
	 */
	async init(): Promise<void> {
		await dbService.init();
		await this.loadChats();
		await this.loadBookmarks();
		
		// Setup mobile detection
		this.updateMobileState();
		window.addEventListener('resize', () => this.updateMobileState());

		appState.update(state => ({ ...state, isInitialized: true }));
	}

	/**
	 * Load all chats from database
	 */
	async loadChats(): Promise<void> {
		try {
			appState.update(state => ({ ...state, isLoading: true }));
			const chatList = await dbService.getAllChats();
			chats.set(chatList);
		} catch (error) {
			console.error('Failed to load chats:', error);
		} finally {
			appState.update(state => ({ ...state, isLoading: false }));
		}
	}

	/**
	 * Load messages for a specific chat with aggressive caching
	 */
	async loadMessages(chatId: string, forceRefresh = false): Promise<void> {
		console.log('LOAD MESSAGES: Starting for chatId:', chatId, 'forceRefresh:', forceRefresh);
		
		const operation = `loadMessages-${chatId}`;
		
		// Check circuit breaker
		if (this.isCircuitBreakerOpen(operation)) {
			console.error('LOAD MESSAGES: Circuit breaker is open, refusing to load messages');
			throw new Error('Circuit breaker is open for loading messages. Please wait and try again.');
		}
		
		if (this.loadingStates.has(chatId)) {
			console.warn(`LOAD MESSAGES: Already loading messages for chat ${chatId}, skipping duplicate request`);
			return;
		}
		
		// Check cache first
		if (!forceRefresh && this.messageCache.has(chatId)) {
			console.log('LOAD MESSAGES: Found cached messages, using cache');
			const cachedMessages = this.messageCache.get(chatId)!;
			messages.set(cachedMessages);
			this.recordSuccess(operation);
			return;
		}

		try {
			this.loadingStates.add(chatId);
			appState.update(state => ({ ...state, isLoading: true }));
			
			console.log('LOAD MESSAGES: Loading messages from database...');
			
			// Add timeout to database call to prevent infinite hanging
			const dbCallPromise = dbService.getAllMessagesForChat(chatId);
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Database call timeout after 8 seconds')), 8000);
			});
			
			const messageList = await Promise.race([dbCallPromise, timeoutPromise]);
			console.log('LOAD MESSAGES: Got messages from DB, count:', messageList.length);
			
			// Validate the message list
			if (!Array.isArray(messageList)) {
				throw new Error('Invalid message list received from database');
			}
			
			// Cache the results
			this.messageCache.set(chatId, messageList);
			messages.set(messageList);
			console.log('LOAD MESSAGES: Messages loaded and cached successfully');
			
			// Record success
			this.recordSuccess(operation);
			
		} catch (error) {
			console.error('LOAD MESSAGES: Failed to load messages:', error);
			
			// Record failure for circuit breaker
			this.recordFailure(operation);
			
			// Clear the cache entry on error
			this.messageCache.delete(chatId);
			// Set empty messages on error
			messages.set([]);
			throw error;
		} finally {
			this.loadingStates.delete(chatId);
			appState.update(state => ({ ...state, isLoading: false }));
		}
	}

	/**
	 * Load all bookmarks
	 */
	async loadBookmarks(): Promise<void> {
		try {
			const bookmarkList = await dbService.getAllBookmarks();
			bookmarks.set(bookmarkList);
			
			// Update bookmark cache
			this.bookmarkCache.clear();
			for (const bookmark of bookmarkList) {
				this.bookmarkCache.set(bookmark.messageId, true);
			}
		} catch (error) {
			console.error('Failed to load bookmarks:', error);
		}
	}

	/**
	 * Switch to a different chat
	 */
	async switchToChat(chatId: string): Promise<void> {
		console.log('SWITCH TO CHAT: Starting for chatId:', chatId);
		
		// Prevent switching to the same chat
		const currentState = get(appState);
		if (currentState.currentChatId === chatId && !currentState.isLoading) {
			console.log('SWITCH TO CHAT: Already viewing this chat, skipping');
			return;
		}
		
		// Prevent multiple simultaneous switches
		const switchOperation = `switchToChat-${chatId}`;
		if (this.loadingStates.has(switchOperation)) {
			console.warn('SWITCH TO CHAT: Already switching to this chat, skipping duplicate request');
			return;
		}
		
		try {
			this.loadingStates.add(switchOperation);
			
			// Add timeout to prevent infinite hanging
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('switchToChat timeout after 10 seconds')), 10000);
			});
			
			console.log('SWITCH TO CHAT: Updating appState...');
			// Update state first - now safe with fixed reactive statements
			appState.update(state => ({ ...state, currentChatId: chatId }));
			console.log('SWITCH TO CHAT: AppState updated, about to load messages');
			
			// Load messages after state update
			await Promise.race([
				this.loadMessages(chatId),
				timeoutPromise
			]);
			
			console.log('SWITCH TO CHAT: Messages loaded successfully');
		} catch (error) {
			console.error('SWITCH TO CHAT: Error occurred:', error);
			// Reset state on error
			appState.update(state => ({ ...state, currentChatId: null, isLoading: false }));
			throw error;
		} finally {
			this.loadingStates.delete(switchOperation);
		}
	}

	/**
	 * Add a new chat from parsed data
	 */
	async addChat(
		name: string,
		participants: string[],
		parsedMessages: ParsedMessage[],
		rawContent: string
	): Promise<string> {
		try {
			console.log('ADD CHAT: Starting addChat process');
			appState.update(state => ({ ...state, isLoading: true }));
			
			const chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			console.log('ADD CHAT: Generated chatId:', chatId);
			
			console.log('ADD CHAT: About to call dbService.storeChat');
			// Store the chat in database
			await dbService.storeChat(chatId, name, participants, parsedMessages, rawContent);
			console.log('ADD CHAT: dbService.storeChat completed');
			
			console.log('ADD CHAT: About to call loadChats');
			// Simply refresh chats list without switching - avoid reactive loops
			await this.loadChats();
			console.log('ADD CHAT: loadChats completed');
			
			console.log('ADD CHAT: Everything completed successfully');
			return chatId;
		} catch (error) {
			console.error('ADD CHAT: Failed to add chat:', error);
			throw error;
		} finally {
			console.log('ADD CHAT: Setting isLoading to false');
			appState.update(state => ({ ...state, isLoading: false }));
		}
	}

	/**
	 * Delete a chat
	 */
	async deleteChat(chatId: string): Promise<void> {
		try {
			appState.update(state => ({ ...state, isLoading: true }));
			
			await dbService.deleteChat(chatId);
			
			// Clear caches
			this.messageCache.delete(chatId);
			this.bookmarkCache.clear(); // Clear all bookmark cache since bookmarks for this chat are deleted
			
			// If we're currently viewing this chat, clear current selection
			const currentState = get(appState);
			if (currentState.currentChatId === chatId) {
				appState.update(state => ({ ...state, currentChatId: null }));
				messages.set([]);
			}
			
			// Refresh data
			await this.loadChats();
			await this.loadBookmarks();
			
		} catch (error) {
			console.error('Failed to delete chat:', error);
			throw error;
		} finally {
			appState.update(state => ({ ...state, isLoading: false }));
		}
	}

	/**
	 * Toggle bookmark for a message
	 */
	async toggleBookmark(messageId: string, chatId: string, note?: string): Promise<void> {
		try {
			const existingBookmark = await dbService.getBookmarkByMessageId(messageId);
			
			if (existingBookmark) {
				await dbService.removeBookmark(existingBookmark.id);
				this.bookmarkCache.set(messageId, false);
			} else {
				await dbService.addBookmark(messageId, chatId, note);
				this.bookmarkCache.set(messageId, true);
			}
			
			// Refresh bookmarks
			await this.loadBookmarks();
			
		} catch (error) {
			console.error('Failed to toggle bookmark:', error);
			throw error;
		}
	}

	/**
	 * Check if a message is bookmarked
	 */
	async isMessageBookmarked(messageId: string): Promise<boolean> {
		// Check cache first
		if (this.bookmarkCache.has(messageId)) {
			return this.bookmarkCache.get(messageId)!;
		}
		
		// Cache miss, check database
		const isBookmarked = await dbService.isMessageBookmarked(messageId);
		this.bookmarkCache.set(messageId, isBookmarked);
		return isBookmarked;
	}

	/**
	 * Search messages across all chats or current chat
	 */
	async searchMessages(query: string, chatId?: string): Promise<Message[]> {
		try {
			return await dbService.searchMessages(query, chatId);
		} catch (error) {
			console.error('Failed to search messages:', error);
			return [];
		}
	}

	/**
	 * Update search query
	 */
	setSearchQuery(query: string): void {
		appState.update(state => ({ ...state, searchQuery: query }));
	}

	/**
	 * Toggle bookmarks view
	 */
	toggleBookmarksView(): void {
		appState.update(state => ({ ...state, showBookmarks: !state.showBookmarks }));
	}

	/**
	 * Clear current chat selection
	 */
	clearCurrentChat(): void {
		appState.update(state => ({ ...state, currentChatId: null }));
		messages.set([]);
	}

	/**
	 * Get message by ID for bookmark navigation
	 */
	async getMessageById(messageId: string): Promise<Message | null> {
		const currentMessages = get(messages);
		const message = currentMessages.find(m => m.id === messageId);
		
		if (message) {
			return message;
		}
		
		// If not in current view, we might need to load the chat
		// This is a simplified implementation - in a real app you'd want more sophisticated handling
		return null;
	}

	/**
	 * Navigate to a bookmarked message
	 */
	async navigateToBookmark(bookmark: Bookmark): Promise<void> {
		// Switch to the chat containing the bookmark
		if (get(appState).currentChatId !== bookmark.chatId) {
			await this.switchToChat(bookmark.chatId);
		}
		
		// The UI component will handle scrolling to the specific message
		// We could emit a custom event or use a reactive store for this
	}

	/**
	 * Update mobile state based on window size
	 */
	private updateMobileState(): void {
		const isMobile = window.innerWidth < 768;
		appState.update(state => ({ ...state, isMobile }));
	}

	/**
	 * Export chat data
	 */
	async exportChat(chatId: string): Promise<string> {
		const chat = await dbService.getChat(chatId);
		if (!chat) throw new Error('Chat not found');
		
		return chat.rawContent;
	}

	/**
	 * Get chat statistics
	 */
	async getChatStats(chatId: string): Promise<{
		messageCount: number;
		participantStats: { [sender: string]: number };
		dateRange: { start: Date; end: Date };
		averageMessagesPerDay: number;
	}> {
		const messageList = await dbService.getAllMessagesForChat(chatId);
		
		const participantStats: { [sender: string]: number } = {};
		let startDate = new Date();
		let endDate = new Date(0);
		
		for (const message of messageList) {
			participantStats[message.sender] = (participantStats[message.sender] || 0) + 1;
			
			if (message.timestamp < startDate) startDate = message.timestamp;
			if (message.timestamp > endDate) endDate = message.timestamp;
		}
		
		const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
		const averageMessagesPerDay = messageList.length / daysDiff;
		
		return {
			messageCount: messageList.length,
			participantStats,
			dateRange: { start: startDate, end: endDate },
			averageMessagesPerDay
		};
	}

	/**
	 * Check if circuit breaker is open for a given operation
	 */
	private isCircuitBreakerOpen(operation: string): boolean {
		const breaker = this.circuitBreaker.get(operation);
		if (!breaker) return false;
		
		if (breaker.failures >= this.MAX_FAILURES) {
			const timeSinceLastFailure = Date.now() - breaker.lastFailure;
			if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
				console.warn(`CIRCUIT BREAKER: Operation ${operation} is circuit broken. Failures: ${breaker.failures}`);
				return true;
			} else {
				// Reset circuit breaker after timeout
				this.circuitBreaker.delete(operation);
				return false;
			}
		}
		
		return false;
	}

	/**
	 * Record a failure for circuit breaker
	 */
	private recordFailure(operation: string): void {
		const breaker = this.circuitBreaker.get(operation) || { failures: 0, lastFailure: 0 };
		breaker.failures++;
		breaker.lastFailure = Date.now();
		this.circuitBreaker.set(operation, breaker);
		console.warn(`CIRCUIT BREAKER: Recorded failure for ${operation}. Total failures: ${breaker.failures}`);
	}

	/**
	 * Record a success for circuit breaker (reset failure count)
	 */
	private recordSuccess(operation: string): void {
		this.circuitBreaker.delete(operation);
	}

	/**
	 * Emergency reset method to recover from frozen states
	 */
	emergencyReset(): void {
		console.log('EMERGENCY RESET: Resetting all state and caches');
		
		// Clear all caches
		this.messageCache.clear();
		this.bookmarkCache.clear();
		this.loadingStates.clear();
		this.circuitBreaker.clear();
		
		// Reset all stores to initial state
		appState.set({
			currentChatId: null,
			isLoading: false,
			searchQuery: '',
			showBookmarks: false,
			isMobile: window.innerWidth < 768,
			isInitialized: true
		});
		
		messages.set([]);
		
		console.log('EMERGENCY RESET: Reset completed');
	}

	/**
	 * Get current state for debugging
	 */
	getDebugInfo(): object {
		return {
			messageCache: Array.from(this.messageCache.keys()),
			loadingStates: Array.from(this.loadingStates),
			circuitBreaker: Array.from(this.circuitBreaker.entries()),
			appState: get(appState),
			chatCount: get(chats).length,
			messageCount: get(messages).length,
			bookmarkCount: get(bookmarks).length
		};
	}
}

// Export singleton instance
export const storeService = new StoreService();

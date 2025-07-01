<script lang="ts">
	import { bookmarks, currentChatBookmarks, chats, appState, storeService } from '$lib/stores.js';
	import type { Bookmark, Chat } from '$lib/stores.js';

	let viewMode: 'all' | 'current' = 'all';

	$: displayedBookmarks = viewMode === 'all' ? $bookmarks : $currentChatBookmarks;

	/**
	 * Get chat name by ID
	 */
	function getChatName(chatId: string): string {
		const chat = $chats.find(c => c.id === chatId);
		return chat?.name || 'Unknown Chat';
	}

	/**
	 * Navigate to bookmarked message
	 */
	async function navigateToBookmark(bookmark: Bookmark) {
		try {
			await storeService.navigateToBookmark(bookmark);
			
			// Close bookmarks panel on mobile
			if ($appState.isMobile) {
				storeService.toggleBookmarksView();
			}
		} catch (error) {
			console.error('Failed to navigate to bookmark:', error);
		}
	}

	/**
	 * Remove a bookmark
	 */
	async function removeBookmark(bookmark: Bookmark, event: Event) {
		event.stopPropagation();
		
		if (confirm('Are you sure you want to remove this bookmark?')) {
			try {
				await storeService.toggleBookmark(bookmark.messageId, bookmark.chatId);
			} catch (error) {
				console.error('Failed to remove bookmark:', error);
				alert('Failed to remove bookmark. Please try again.');
			}
		}
	}

	/**
	 * Format bookmark date
	 */
	function formatBookmarkDate(date: Date): string {
		const now = new Date();
		const diffTime = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return date.toLocaleTimeString('en-US', { 
				hour: 'numeric', 
				minute: '2-digit',
				hour12: true 
			});
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return date.toLocaleDateString('en-US', { weekday: 'long' });
		} else {
			return date.toLocaleDateString('en-US', { 
				month: 'short', 
				day: 'numeric',
				year: diffDays > 365 ? 'numeric' : undefined
			});
		}
	}

	/**
	 * Get message preview from bookmark
	 */
	async function getMessagePreview(messageId: string): Promise<string> {
		try {
			const message = await storeService.getMessageById(messageId);
			if (message) {
				return message.content.length > 100 
					? message.content.substring(0, 100) + '...'
					: message.content;
			}
		} catch (error) {
			console.error('Failed to get message preview:', error);
		}
		return 'Message not found';
	}

	/**
	 * Close bookmarks panel
	 */
	function closePanel() {
		storeService.toggleBookmarksView();
	}
</script>

<div class="bookmarks-panel">
	<div class="bookmarks-header">
		<div class="header-content">
			<h3>Bookmarks</h3>
			<button class="close-button" on:click={closePanel}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
					<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		</div>

		<div class="view-toggle">
			<button 
				class="toggle-button"
				class:active={viewMode === 'all'}
				on:click={() => viewMode = 'all'}
			>
				All ({$bookmarks.length})
			</button>
			<button 
				class="toggle-button"
				class:active={viewMode === 'current'}
				on:click={() => viewMode = 'current'}
				disabled={!$appState.currentChatId}
			>
				Current ({$currentChatBookmarks.length})
			</button>
		</div>
	</div>

	<div class="bookmarks-content">
		{#if displayedBookmarks.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
						<path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
				<h4>No bookmarks yet</h4>
				<p>
					{#if viewMode === 'current' && !$appState.currentChatId}
						Select a chat to see its bookmarks
					{:else if viewMode === 'current'}
						No bookmarks in this chat. Tap the bookmark icon on messages to save them.
					{:else}
						Start bookmarking messages by tapping the bookmark icon next to any message.
					{/if}
				</p>
			</div>
		{:else}
			<div class="bookmarks-list">
				{#each displayedBookmarks as bookmark (bookmark.id)}
					<div 
						class="bookmark-item"
						on:click={() => navigateToBookmark(bookmark)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && navigateToBookmark(bookmark)}
					>
						<div class="bookmark-content">
							<div class="bookmark-header">
								{#if viewMode === 'all'}
									<span class="chat-name">{getChatName(bookmark.chatId)}</span>
								{/if}
								<span class="bookmark-date">{formatBookmarkDate(bookmark.createdAt)}</span>
							</div>
							
							<div class="message-preview">
								{#await getMessagePreview(bookmark.messageId)}
									<span class="loading-text">Loading...</span>
								{:then preview}
									<span class="message-text">{preview}</span>
								{:catch error}
									<span class="message-text error">Failed to load message</span>
								{/await}
							</div>

							{#if bookmark.note}
								<div class="bookmark-note">
									<span class="note-label">Note:</span> {bookmark.note}
								</div>
							{/if}
						</div>

						<div class="bookmark-actions">
							<button 
								class="remove-button"
								on:click={(e) => removeBookmark(bookmark, e)}
								title="Remove bookmark"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
									<path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.bookmarks-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--wa-white);
	}

	.bookmarks-header {
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-lg);
	}

	.header-content h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: var(--wa-text-secondary);
		transition: all var(--transition-fast);
	}

	.close-button:hover {
		background: var(--wa-gray-light);
		color: var(--wa-text-primary);
	}

	.view-toggle {
		display: flex;
		background: var(--wa-gray-light);
		border-radius: var(--radius-lg);
		padding: 2px;
	}

	.toggle-button {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: calc(var(--radius-lg) - 2px);
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--wa-text-secondary);
		transition: all var(--transition-fast);
		text-align: center;
	}

	.toggle-button.active {
		background: var(--wa-white);
		color: var(--wa-text-primary);
		box-shadow: var(--shadow-sm);
	}

	.toggle-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.bookmarks-content {
		flex: 1;
		overflow-y: auto;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl);
		text-align: center;
		height: 100%;
		color: var(--wa-text-secondary);
	}

	.empty-icon {
		margin-bottom: var(--spacing-lg);
		opacity: 0.5;
	}

	.empty-state h4 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.empty-state p {
		margin: 0;
		line-height: 1.5;
		max-width: 250px;
	}

	.bookmarks-list {
		padding: var(--spacing-sm);
	}

	.bookmark-item {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
		border: 1px solid transparent;
		margin-bottom: var(--spacing-xs);
	}

	.bookmark-item:hover {
		background: var(--wa-gray-light);
		border-color: var(--wa-border);
	}

	.bookmark-content {
		flex: 1;
		min-width: 0;
	}

	.bookmark-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-xs);
		gap: var(--spacing-sm);
	}

	.chat-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--wa-green-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.bookmark-date {
		font-size: 0.75rem;
		color: var(--wa-text-secondary);
		white-space: nowrap;
	}

	.message-preview {
		margin-bottom: var(--spacing-xs);
	}

	.message-text {
		font-size: 0.9rem;
		line-height: 1.4;
		color: var(--wa-text-primary);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.message-text.error {
		color: var(--wa-text-secondary);
		font-style: italic;
	}

	.loading-text {
		font-size: 0.9rem;
		color: var(--wa-text-secondary);
		font-style: italic;
	}

	.bookmark-note {
		margin-top: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--wa-blue-light);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		line-height: 1.3;
	}

	.note-label {
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.bookmark-actions {
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.bookmark-item:hover .bookmark-actions {
		opacity: 1;
	}

	.remove-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #fee;
		color: #c53030;
		transition: all var(--transition-fast);
	}

	.remove-button:hover {
		background: #fed7d7;
		transform: scale(1.1);
	}

	@media (max-width: 767px) {
		.bookmarks-header {
			padding: var(--spacing-md);
		}

		.bookmark-item {
			padding: var(--spacing-sm);
		}

		.bookmark-actions {
			opacity: 1; /* Always visible on mobile */
		}

		.remove-button {
			width: 28px;
			height: 28px;
		}
	}
</style>

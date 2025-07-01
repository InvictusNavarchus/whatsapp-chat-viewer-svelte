<script lang="ts">
	import { storeService } from '$lib/stores.js';
	import type { Message } from '$lib/stores.js';

	export let message: Message;
	export let searchQuery: string = '';

	let isBookmarked = false;
	let isLoading = false;

	// Check if message is bookmarked on mount
	$: if (message) {
		checkBookmarkStatus();
	}

	/**
	 * Check if the message is bookmarked
	 */
	async function checkBookmarkStatus() {
		try {
			isBookmarked = await storeService.isMessageBookmarked(message.id);
		} catch (error) {
			console.error('Failed to check bookmark status:', error);
		}
	}

	/**
	 * Toggle bookmark for this message
	 */
	async function toggleBookmark() {
		if (isLoading) return;

		try {
			isLoading = true;
			await storeService.toggleBookmark(message.id, message.chatId);
			isBookmarked = !isBookmarked;
		} catch (error) {
			console.error('Failed to toggle bookmark:', error);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Format timestamp for display
	 */
	function formatTime(timestamp: Date): string {
		return timestamp.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	/**
	 * Determine if this is a sent message (from the first participant)
	 */
	function isSentMessage(sender: string): boolean {
		// This is a simplified logic - in a real app you'd want to identify the current user
		// For now, we'll consider the first participant as "sent" messages
		return sender !== 'System';
	}

	/**
	 * Highlight search terms in the message content
	 */
	function highlightSearchTerms(content: string, query: string): string {
		if (!query) return content;
		
		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return content.replace(regex, '<mark>$1</mark>');
	}

	/**
	 * Check if message contains media indicators
	 */
	function hasMediaIndicator(content: string): boolean {
		const mediaPatterns = [
			'<Media omitted>',
			'image omitted',
			'video omitted',
			'audio omitted',
			'document omitted',
			'GIF omitted',
			'sticker omitted'
		];
		
		return mediaPatterns.some(pattern => 
			content.toLowerCase().includes(pattern.toLowerCase())
		);
	}

	/**
	 * Get media type from content
	 */
	function getMediaType(content: string): string {
		const lowerContent = content.toLowerCase();
		
		if (lowerContent.includes('image')) return '📷 Image';
		if (lowerContent.includes('video')) return '🎥 Video';
		if (lowerContent.includes('audio')) return '🎵 Audio';
		if (lowerContent.includes('document')) return '📄 Document';
		if (lowerContent.includes('gif')) return '🎬 GIF';
		if (lowerContent.includes('sticker')) return '😀 Sticker';
		
		return '📎 Media';
	}
</script>

<div 
	id="message-{message.id}"
	class="message-container"
	class:system={message.sender === 'System'}
>
	<div 
		class="message-bubble"
		class:sent={isSentMessage(message.sender) && message.sender !== 'System'}
		class:received={!isSentMessage(message.sender) && message.sender !== 'System'}
		class:system={message.sender === 'System'}
	>
		<!-- Sender name for received messages in group chats -->
		{#if !isSentMessage(message.sender) && message.sender !== 'System'}
			<div class="sender-name">{message.sender}</div>
		{/if}

		<!-- Message content -->
		<div class="message-content">
			{#if hasMediaIndicator(message.content)}
				<div class="media-indicator">
					<span class="media-icon">{getMediaType(message.content)}</span>
					<span class="media-text">Media file not included in export</span>
				</div>
			{:else if searchQuery}
				{@html highlightSearchTerms(message.content, searchQuery)}
			{:else}
				{message.content}
			{/if}
		</div>

		<!-- Message footer -->
		<div class="message-footer">
			<span class="message-time">{formatTime(message.timestamp)}</span>
			
			{#if message.sender !== 'System'}
				<button 
					class="bookmark-button"
					class:bookmarked={isBookmarked}
					class:loading={isLoading}
					on:click={toggleBookmark}
					title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
					disabled={isLoading}
				>
					{#if isLoading}
						<div class="loading-spinner-small"></div>
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
							<path 
								d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" 
								stroke="currentColor" 
								stroke-width="1.5" 
								stroke-linecap="round" 
								stroke-linejoin="round"
								fill={isBookmarked ? 'currentColor' : 'none'}
							/>
						</svg>
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.message-container {
		display: flex;
		margin-bottom: var(--spacing-xs);
		width: 100%;
	}

	.message-container.system {
		justify-content: center;
	}

	.message-bubble {
		max-width: 70%;
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: 12px;
		position: relative;
		word-wrap: break-word;
		overflow-wrap: break-word;
		box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
	}

	.message-bubble.sent {
		background: #dcf8c6;
		align-self: flex-end;
		margin-left: auto;
		border-bottom-right-radius: 4px;
	}

	.message-bubble.received {
		background: var(--wa-white);
		align-self: flex-start;
		margin-right: auto;
		border-bottom-left-radius: 4px;
	}

	.message-bubble.system {
		background: rgba(114, 114, 114, 0.15);
		align-self: center;
		max-width: 80%;
		text-align: center;
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-lg);
	}

	.sender-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--wa-text-secondary);
		margin-bottom: var(--spacing-xs);
	}

	.message-content {
		font-size: 0.9rem;
		line-height: 1.4;
		color: var(--wa-text-primary);
		white-space: pre-wrap;
		margin-bottom: var(--spacing-xs);
	}

	.message-content :global(mark) {
		background: #ffeb3b;
		padding: 1px 2px;
		border-radius: 2px;
	}

	.media-indicator {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-style: italic;
		color: var(--wa-text-secondary);
	}

	.media-icon {
		font-size: 1.1rem;
	}

	.media-text {
		font-size: 0.85rem;
	}

	.message-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-xs);
	}

	.message-time {
		font-size: 0.7rem;
		color: var(--wa-text-secondary);
		opacity: 0.8;
	}

	.bookmark-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		opacity: 0;
		transition: all var(--transition-fast);
		color: var(--wa-text-secondary);
	}

	.message-bubble:hover .bookmark-button {
		opacity: 1;
	}

	.bookmark-button:hover {
		background: rgba(0, 0, 0, 0.1);
		color: var(--wa-text-primary);
	}

	.bookmark-button.bookmarked {
		opacity: 1;
		color: var(--wa-green-primary);
	}

	.bookmark-button.bookmarked:hover {
		color: var(--wa-green-dark);
	}

	.bookmark-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.loading-spinner-small {
		width: 12px;
		height: 12px;
		border: 1.5px solid var(--wa-gray-medium);
		border-radius: 50%;
		border-top-color: var(--wa-green-primary);
		animation: spin 0.8s linear infinite;
	}

	/* Responsive adjustments */
	@media (max-width: 767px) {
		.message-bubble {
			max-width: 85%;
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.message-content {
			font-size: 0.85rem;
		}

		.bookmark-button {
			opacity: 1; /* Always visible on mobile */
		}
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.message-bubble.received {
			background: #2a2a2a;
		}
		
		.message-bubble.sent {
			background: #005c4b;
		}
		
		.message-content {
			color: #e5e5e5;
		}
		
		.sender-name {
			color: #aaa;
		}
		
		.message-time {
			color: #999;
		}
	}
</style>

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { messages, filteredMessages, currentChat, appState, storeService } from '$lib/stores';
	import type { Message } from '$lib/stores';
	import MessageBubble from './MessageBubble.svelte';
	import ChatHeader from './ChatHeader.svelte';
	import log from '$lib/logger';

	let messagesContainer: HTMLElement;
	let searchInput: HTMLInputElement;
	let isNearBottom = true;
	let showScrollButton = false;
	let virtualizedMessages: Message[] = [];
	let startIndex = 0;
	let endIndex = 0;
	let itemHeight = 80; // Approximate height of each message
	let containerHeight = 0;
	let scrollTop = 0;

	// Virtualization settings
	const BUFFER_SIZE = 10;
	const VISIBLE_ITEMS = 20;

	// TEMPORARILY DISABLED REACTIVE STATEMENTS FOR DEBUGGING
	// $: if ($currentChat && $messages.length > 0) {
	// 	updateVirtualizedMessages();
	// }

	// $: displayMessages = $appState.searchQuery ? $filteredMessages : virtualizedMessages;

	/**
	 * Update virtualized messages based on scroll position
	 */
	function updateVirtualizedMessages() {
		if (!$messages.length) return;

		const visibleStart = Math.floor(scrollTop / itemHeight);
		const visibleEnd = Math.min(
			visibleStart + Math.ceil(containerHeight / itemHeight),
			$messages.length
		);

		startIndex = Math.max(0, visibleStart - BUFFER_SIZE);
		endIndex = Math.min($messages.length, visibleEnd + BUFFER_SIZE);

		virtualizedMessages = $messages.slice(startIndex, endIndex);
	}

	/**
	 * Handle scroll events for virtualization and scroll button
	 */
	function handleScroll() {
		if (!messagesContainer) return;

		scrollTop = messagesContainer.scrollTop;
		containerHeight = messagesContainer.clientHeight;
		
		const { scrollHeight, clientHeight } = messagesContainer;
		const scrollBottom = scrollHeight - scrollTop - clientHeight;
		
		isNearBottom = scrollBottom < 100;
		showScrollButton = scrollBottom > 300;

		// Update virtualized messages when not searching
		if (!$appState.searchQuery) {
			updateVirtualizedMessages();
		}
	}

	/**
	 * Scroll to bottom of messages
	 */
	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	/**
	 * Handle search input
	 */
	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		storeService.setSearchQuery(target.value);
	}

	/**
	 * Clear search
	 */
	function clearSearch() {
		storeService.setSearchQuery('');
		if (searchInput) {
			searchInput.value = '';
		}
	}

	/**
	 * Scroll to a specific message (for bookmark navigation)
	 */
	function scrollToMessage(messageId: string) {
		const messageElement = document.getElementById(`message-${messageId}`);
		if (messageElement) {
			messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Highlight the message briefly
			messageElement.classList.add('highlighted');
			setTimeout(() => {
				messageElement.classList.remove('highlighted');
			}, 2000);
		}
	}

	/**
	 * Format date for day separators
	 */
	function formatDateSeparator(date: Date): string {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-US', { 
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		}
	}

	/**
	 * Check if we should show a date separator
	 */
	function shouldShowDateSeparator(currentMessage: Message, previousMessage: Message | null): boolean {
		if (!previousMessage) return true;
		
		const currentDate = new Date(currentMessage.timestamp);
		const previousDate = new Date(previousMessage.timestamp);
		
		return currentDate.toDateString() !== previousDate.toDateString();
	}

	/**
	 * Auto-scroll to bottom when new messages are loaded
	 */
	onMount(() => {
		if (messagesContainer && isNearBottom) {
			tick().then(() => {
				scrollToBottom();
			});
		}
	});

	// TEMPORARILY DISABLED: Auto-scroll to bottom when chat changes
	// $: if ($currentChat && messagesContainer) {
	// 	tick().then(() => {
	// 		scrollToBottom();
	// 		isNearBottom = true;
	// 	});
	// }
</script>

{#if $currentChat}
	<div class="chat-view">
		<ChatHeader chat={$currentChat} />
		
		<!-- Search Bar -->
		<div class="search-bar">
			<div class="search-input-wrapper">
				<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
					<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
					<path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<input
					bind:this={searchInput}
					type="text"
					placeholder="Search messages..."
					on:input={handleSearch}
					class="search-input"
				/>
				{#if $appState.searchQuery}
					<button class="clear-search" on:click={clearSearch} aria-label="Clear search">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</button>
				{/if}
			</div>
			
			{#if $appState.searchQuery}
				<div class="search-results-info">
					{$filteredMessages.length} message{$filteredMessages.length === 1 ? '' : 's'} found
				</div>
			{/if}
		</div>

		<!-- Messages Container -->
		<div 
			class="messages-container"
			bind:this={messagesContainer}
			on:scroll={handleScroll}
		>
			<div class="messages-content" style="height: {$appState.searchQuery ? 'auto' : $messages.length * itemHeight + 'px'}">
				{#if $appState.searchQuery}
					<!-- Search results view -->
					{#each displayMessages as message, index (message.id)}
						{@const previousMessage = index > 0 ? displayMessages[index - 1] : null}
						
						{#if shouldShowDateSeparator(message, previousMessage)}
							<div class="date-separator">
								<span>{formatDateSeparator(message.timestamp)}</span>
							</div>
						{/if}
						
						<MessageBubble {message} searchQuery={$appState.searchQuery} />
					{/each}
				{:else}
					<!-- Virtualized view -->
					<div style="height: {startIndex * itemHeight}px;"></div>
					{#each virtualizedMessages as message, index (message.id)}
						{@const actualIndex = startIndex + index}
						{@const previousMessage = actualIndex > 0 ? $messages[actualIndex - 1] : null}
						
						{#if shouldShowDateSeparator(message, previousMessage)}
							<div class="date-separator">
								<span>{formatDateSeparator(message.timestamp)}</span>
							</div>
						{/if}
						
						<MessageBubble {message} />
					{/each}
					<div style="height: {($messages.length - endIndex) * itemHeight}px;"></div>
				{/if}
			</div>

			<!-- Scroll to bottom button -->
			{#if showScrollButton}
				<button class="scroll-to-bottom" on:click={scrollToBottom} aria-label="Scroll to bottom">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M7 13L12 18L17 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.chat-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--wa-white);
	}

	.search-bar {
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
		background: var(--wa-gray-light);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: var(--spacing-md);
		color: var(--wa-text-secondary);
		z-index: 1;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 2.5rem;
		background: var(--wa-white);
		border-radius: var(--radius-lg);
		font-size: 0.9rem;
		color: var(--wa-text-primary);
		transition: all var(--transition-fast);
		border: 1px solid var(--wa-border);
	}

	.search-input:focus {
		border-color: var(--wa-green-primary);
		box-shadow: 0 0 0 2px rgba(37, 211, 102, 0.1);
	}

	.clear-search {
		position: absolute;
		right: var(--spacing-md);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		color: var(--wa-text-secondary);
		transition: all var(--transition-fast);
	}

	.clear-search:hover {
		background: var(--wa-gray-medium);
		color: var(--wa-text-primary);
	}

	.search-results-info {
		margin-top: var(--spacing-sm);
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
		text-align: center;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		background: #e5ddd5; /* WhatsApp chat background */
		background-image: 
			radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.03) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(120, 119, 198, 0.03) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.03) 0%, transparent 50%);
		position: relative;
		scroll-behavior: smooth;
	}

	.messages-content {
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		min-height: 100%;
	}

	.date-separator {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: var(--spacing-lg) 0;
		position: relative;
	}

	.date-separator::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--wa-border);
		z-index: 0;
	}

	.date-separator span {
		background: var(--wa-gray-light);
		padding: var(--spacing-xs) var(--spacing-md);
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
		position: relative;
		z-index: 1;
		border: 1px solid var(--wa-border);
	}

	.scroll-to-bottom {
		position: fixed;
		bottom: var(--spacing-xl);
		right: var(--spacing-xl);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--wa-green-primary);
		color: white;
		box-shadow: var(--shadow-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
		z-index: var(--z-sticky);
	}

	.scroll-to-bottom:hover {
		background: var(--wa-green-dark);
		transform: scale(1.1);
	}

	/* Highlight animation for bookmark navigation */
	:global(.message-bubble.highlighted) {
		animation: highlight 2s ease-in-out;
	}

	@keyframes highlight {
		0%, 100% { background-color: transparent; }
		50% { background-color: rgba(37, 211, 102, 0.2); }
	}

	@media (max-width: 767px) {
		.search-bar {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.messages-content {
			padding: var(--spacing-sm);
		}

		.scroll-to-bottom {
			bottom: var(--spacing-lg);
			right: var(--spacing-lg);
			width: 44px;
			height: 44px;
		}
	}
</style>

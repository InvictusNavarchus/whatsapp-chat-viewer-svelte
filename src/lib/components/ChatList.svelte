<script lang="ts">
	import { chats, appState, storeService } from '$lib/stores';
	import { get } from 'svelte/store';
	import type { Chat } from '$lib/stores';
	import log from '$lib/logger';

	let searchQuery = '';
	let filteredChats: Chat[] = [];

	// Reactive filtering
	$: {
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredChats = $chats.filter(chat => 
				chat.name.toLowerCase().includes(query) ||
				chat.participants.some(p => p.toLowerCase().includes(query))
			);
		} else {
			filteredChats = $chats;
		}
	}

	/**
	 * Select a chat and load its messages
	 */
	async function selectChat(chat: Chat) {
		console.log('CHATLIST: selectChat called for chat:', chat.id, chat.name);
		
		try {
			await storeService.switchToChat(chat.id);
			console.log('CHATLIST: Chat switched successfully');
		} catch (error) {
			console.error('CHATLIST: Error switching chat:', error);
			alert(`Failed to load chat "${chat.name}". Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Delete a chat with confirmation
	 */
	async function deleteChat(chat: Chat, event: Event) {
		event.stopPropagation();
		
		if (confirm(`Are you sure you want to delete "${chat.name}"? This action cannot be undone.`)) {
			try {
				await storeService.deleteChat(chat.id);
			} catch (error) {
				alert('Failed to delete chat. Please try again.');
			}
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(date: Date): string {
		const now = new Date();
		const diffTime = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return 'Today';
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
	 * Format message count
	 */
	function formatMessageCount(count: number): string {
		if (count < 1000) return count.toString();
		if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
		return `${(count / 1000000).toFixed(1)}M`;
	}

	/**
	 * Open file picker for new upload
	 */
	function openUpload() {
		// This would trigger the upload area to show
		// For now, we'll just clear the current chat
		storeService.clearCurrentChat();
	}
</script>

<div class="chat-list">
	<div class="chat-list-header">
		<h2>Chats</h2>
		<button class="add-chat-button" on:click={openUpload} title="Upload new chat">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</div>

	<div class="search-container">
		<div class="search-input-wrapper">
			<svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
				<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
				<path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<input
				type="text"
				placeholder="Search chats..."
				bind:value={searchQuery}
				class="search-input"
			/>
			{#if searchQuery}
				<button class="clear-search" on:click={() => searchQuery = ''}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="chat-list-content">
		{#if filteredChats.length === 0}
			<div class="empty-state">
				{#if searchQuery}
					<p>No chats found matching "{searchQuery}"</p>
				{:else}
					<p>No chats available</p>
					<button class="upload-first-chat" on:click={openUpload}>
						Upload your first chat
					</button>
				{/if}
			</div>
		{:else}
			{#each filteredChats as chat (chat.id)}
				<div 
					class="chat-item"
					class:active={$appState.currentChatId === chat.id}
					on:click={() => selectChat(chat)}
					role="button"
					tabindex="0"
					on:keydown={(e) => e.key === 'Enter' && selectChat(chat)}
				>
					<div class="chat-avatar">
						{#if chat.participants.length === 2}
							<!-- Individual chat icon -->
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
							</svg>
						{:else}
							<!-- Group chat icon -->
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
								<path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						{/if}
					</div>

					<div class="chat-info">
						<div class="chat-header">
							<h3 class="chat-name">{chat.name}</h3>
							<span class="chat-date">{formatDate(chat.lastMessageAt)}</span>
						</div>
						
						<div class="chat-meta">
							<span class="participant-count">
								{chat.participants.length} participant{chat.participants.length === 1 ? '' : 's'}
							</span>
							<span class="message-count">
								{formatMessageCount(chat.messageCount)} messages
							</span>
						</div>
					</div>

					<div class="chat-actions">
						<button 
							class="delete-button"
							on:click={(e) => deleteChat(chat, e)}
							title="Delete chat"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
								<path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.chat-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--wa-white);
	}

	.chat-list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
	}

	.chat-list-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.add-chat-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--wa-green-primary);
		color: white;
		transition: background-color var(--transition-fast);
	}

	.add-chat-button:hover {
		background: var(--wa-green-dark);
	}

	.search-container {
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
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
		padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 3rem;
		background: var(--wa-gray-light);
		border-radius: var(--radius-lg);
		font-size: 0.9rem;
		color: var(--wa-text-primary);
		transition: background-color var(--transition-fast);
	}

	.search-input:focus {
		background: var(--wa-white);
		box-shadow: var(--shadow-sm);
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

	.chat-list-content {
		flex: 1;
		overflow-y: auto;
	}

	.empty-state {
		padding: var(--spacing-xl);
		text-align: center;
		color: var(--wa-text-secondary);
	}

	.empty-state p {
		margin-bottom: var(--spacing-lg);
	}

	.upload-first-chat {
		background: var(--wa-green-primary);
		color: white;
		padding: var(--spacing-md) var(--spacing-lg);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		transition: background-color var(--transition-fast);
	}

	.upload-first-chat:hover {
		background: var(--wa-green-dark);
	}

	.chat-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
		cursor: pointer;
		transition: background-color var(--transition-fast);
		position: relative;
	}

	.chat-item:hover {
		background: var(--wa-gray-light);
	}

	.chat-item.active {
		background: var(--wa-green-light);
		border-left: 4px solid var(--wa-green-primary);
	}

	.chat-avatar {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		background: var(--wa-gray-light);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--wa-text-secondary);
	}

	.chat-info {
		flex: 1;
		min-width: 0;
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-xs);
	}

	.chat-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: var(--wa-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat-date {
		font-size: 0.75rem;
		color: var(--wa-text-secondary);
		flex-shrink: 0;
		margin-left: var(--spacing-sm);
	}

	.chat-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
	}

	.chat-actions {
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.chat-item:hover .chat-actions {
		opacity: 1;
	}

	.delete-button {
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

	.delete-button:hover {
		background: #fed7d7;
		transform: scale(1.1);
	}

	@media (max-width: 767px) {
		.chat-list-header {
			padding: var(--spacing-md);
		}

		.search-container {
			padding: var(--spacing-md);
		}

		.chat-item {
			padding: var(--spacing-md);
		}

		.chat-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-xs);
		}
	}
</style>

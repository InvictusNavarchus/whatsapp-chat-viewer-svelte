<script lang="ts">
	import { appState, chats, currentChat } from '$lib/stores.js';
	import ChatList from '$lib/components/ChatList.svelte';
	import ChatView from '$lib/components/ChatView.svelte';
	import UploadArea from '$lib/components/UploadArea.svelte';
	import BookmarksPanel from '$lib/components/BookmarksPanel.svelte';
	import Header from '$lib/components/Header.svelte';
	import log from '$lib/logger';
</script>

<svelte:head>
	<title>WhatsApp Chat Viewer</title>
	<meta name="description" content="View and manage your WhatsApp chat exports with bookmarks and search" />
</svelte:head>

{#if !$appState.isInitialized}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
		<p>Loading WhatsApp Chat Viewer...</p>
	</div>
{:else}
	<div class="app-container">
		<Header />
		
		<div class="main-content">
			<!-- Chat List Sidebar -->
			<aside class="sidebar" class:hidden={$appState.isMobile && $appState.currentChatId}>
				{#if $chats.length === 0}
					<UploadArea />
				{:else}
					<ChatList />
				{/if}
			</aside>

			<!-- Main Chat View -->
			<main class="chat-area" class:hidden={$appState.isMobile && !$appState.currentChatId}>
				{#if $currentChat}
					<ChatView />
				{:else if $chats.length > 0}
					<div class="welcome-screen">
						<div class="welcome-content">
							<h2>Select a chat to start viewing</h2>
							<p>Choose a chat from the sidebar to see your messages</p>
						</div>
					</div>
				{:else}
					<div class="welcome-screen">
						<UploadArea />
					</div>
				{/if}
			</main>

			<!-- Bookmarks Panel -->
			{#if $appState.showBookmarks}
				<aside class="bookmarks-panel">
					<BookmarksPanel />
				</aside>
			{/if}
		</div>
	</div>
{/if}

<style>
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: var(--wa-gray-light);
		gap: var(--spacing-lg);
	}

	.loading-screen p {
		color: var(--wa-text-secondary);
		font-size: 1.1rem;
	}

	.app-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--wa-gray-light);
	}

	.main-content {
		flex: 1;
		display: flex;
		height: calc(100vh - 60px); /* Account for header height */
		overflow: hidden;
	}

	.sidebar {
		width: 400px;
		background: var(--wa-white);
		border-right: 1px solid var(--wa-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--wa-white);
		position: relative;
	}

	.bookmarks-panel {
		width: 350px;
		background: var(--wa-white);
		border-left: 1px solid var(--wa-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.welcome-screen {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--wa-gray-light);
	}

	.welcome-content {
		text-align: center;
		padding: var(--spacing-xl);
	}

	.welcome-content h2 {
		color: var(--wa-text-primary);
		margin-bottom: var(--spacing-md);
		font-weight: 400;
	}

	.welcome-content p {
		color: var(--wa-text-secondary);
		font-size: 1rem;
	}

	/* Mobile Responsive */
	@media (max-width: 767px) {
		.sidebar {
			width: 100%;
		}

		.chat-area {
			width: 100%;
		}

		.bookmarks-panel {
			position: fixed;
			top: 60px;
			right: 0;
			height: calc(100vh - 60px);
			width: 300px;
			z-index: var(--z-modal);
			box-shadow: var(--shadow-lg);
		}

		.hidden {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.sidebar {
			width: 100vw;
		}

		.bookmarks-panel {
			width: 280px;
		}
	}
</style>

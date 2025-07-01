<script lang="ts">
	import { appState, storeService } from '$lib/stores.js';

	/**
	 * Toggle bookmarks panel visibility
	 */
	function toggleBookmarks() {
		storeService.toggleBookmarksView();
	}

	/**
	 * Navigate back to chat list on mobile
	 */
	function goBack() {
		storeService.clearCurrentChat();
	}
</script>

<header class="header">
	<div class="header-left">
		{#if $appState.isMobile && $appState.currentChatId}
			<button class="back-button" on:click={goBack} aria-label="Go back to chat list">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path d="M19 12H5M12 5L5 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		{/if}
		
		<div class="logo">
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<path d="M16 2C8.268 2 2 8.268 2 16C2 18.4 2.67 20.642 3.8 22.55L2.35 29.65L9.45 28.2C11.358 29.33 13.6 30 16 30C23.732 30 30 23.732 30 16C30 8.268 23.732 2 16 2Z" fill="var(--wa-green-primary)"/>
				<path d="M23.5 16.5C23.5 20.366 20.366 23.5 16.5 23.5C15.298 23.5 14.172 23.19 13.196 22.65L9.5 23.5L10.35 19.804C9.81 18.828 9.5 17.702 9.5 16.5C9.5 12.634 12.634 9.5 16.5 9.5C20.366 9.5 23.5 12.634 23.5 16.5Z" fill="white"/>
			</svg>
			<h1>WhatsApp Chat Viewer</h1>
		</div>
	</div>

	<div class="header-right">
		<button 
			class="bookmark-toggle"
			class:active={$appState.showBookmarks}
			on:click={toggleBookmarks}
			title="Toggle Bookmarks"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" 
					stroke="currentColor" 
					stroke-width="2" 
					stroke-linecap="round" 
					stroke-linejoin="round"
					fill={$appState.showBookmarks ? 'currentColor' : 'none'}
				/>
			</svg>
			<span class="hidden-mobile">Bookmarks</span>
		</button>
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
		background: var(--wa-green-primary);
		color: white;
		padding: 0 var(--spacing-lg);
		box-shadow: var(--shadow-sm);
		z-index: var(--z-sticky);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		color: white;
		transition: background-color var(--transition-fast);
	}

	.back-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.logo h1 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.bookmark-toggle {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		color: white;
		transition: all var(--transition-fast);
		font-size: 0.9rem;
	}

	.bookmark-toggle:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.bookmark-toggle.active {
		background-color: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 767px) {
		.header {
			padding: 0 var(--spacing-md);
		}

		.logo h1 {
			font-size: 1.1rem;
		}

		.bookmark-toggle {
			padding: var(--spacing-sm);
		}
	}

	@media (max-width: 480px) {
		.logo h1 {
			display: none;
		}
	}
</style>

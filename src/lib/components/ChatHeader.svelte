<script lang="ts">
	import { storeService } from '$lib/stores.js';
	import type { Chat } from '$lib/stores.js';

	export let chat: Chat;

	let showStats = false;
	let stats: any = null;
	let loadingStats = false;

	/**
	 * Toggle statistics display
	 */
	async function toggleStats() {
		if (!showStats && !stats) {
			await loadStats();
		}
		showStats = !showStats;
	}

	/**
	 * Load chat statistics
	 */
	async function loadStats() {
		if (loadingStats) return;

		try {
			loadingStats = true;
			stats = await storeService.getChatStats(chat.id);
		} catch (error) {
			console.error('Failed to load stats:', error);
		} finally {
			loadingStats = false;
		}
	}

	/**
	 * Export chat data
	 */
	async function exportChat() {
		try {
			const content = await storeService.exportChat(chat.id);
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `${chat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.txt`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export chat:', error);
			alert('Failed to export chat. Please try again.');
		}
	}

	/**
	 * Format number with commas
	 */
	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	/**
	 * Format percentage
	 */
	function formatPercentage(value: number, total: number): string {
		return ((value / total) * 100).toFixed(1) + '%';
	}
</script>

<div class="chat-header">
	<div class="chat-info">
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
		
		<div class="chat-details">
			<h3 class="chat-name">{chat.name}</h3>
			<div class="chat-meta">
				<span class="participants">
					{chat.participants.length} participant{chat.participants.length === 1 ? '' : 's'}
					{#if chat.participants.length <= 3}
						• {chat.participants.join(', ')}
					{/if}
				</span>
			</div>
		</div>
	</div>

	<div class="chat-actions">
		<button 
			class="action-button"
			class:active={showStats}
			on:click={toggleStats}
			title="View statistics"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path d="M16 4V10C16 10.5304 16.2107 11.0391 16.5858 11.4142C16.9609 11.7893 17.4696 12 18 12H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M6 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H14L22 10V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M7 14L12 9L17 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		<button 
			class="action-button"
			on:click={exportChat}
			title="Export chat"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</div>
</div>

{#if showStats}
	<div class="stats-panel">
		{#if loadingStats}
			<div class="stats-loading">
				<div class="loading-spinner"></div>
				<span>Loading statistics...</span>
			</div>
		{:else if stats}
			<div class="stats-content">
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Total Messages</span>
						<span class="stat-value">{formatNumber(stats.messageCount)}</span>
					</div>
					
					<div class="stat-item">
						<span class="stat-label">Messages per Day</span>
						<span class="stat-value">{formatNumber(Math.round(stats.averageMessagesPerDay))}</span>
					</div>
					
					<div class="stat-item">
						<span class="stat-label">Date Range</span>
						<span class="stat-value">
							{stats.dateRange.start.toLocaleDateString()} - {stats.dateRange.end.toLocaleDateString()}
						</span>
					</div>
				</div>

				{#if Object.keys(stats.participantStats).length > 0}
					<div class="participant-stats">
						<h4>Message Distribution</h4>
						<div class="participant-list">
							{#each Object.entries(stats.participantStats).sort(([,a], [,b]) => b - a) as [participant, count]}
								<div class="participant-stat">
									<div class="participant-info">
										<span class="participant-name">{participant}</span>
										<span class="participant-count">{formatNumber(count)} messages</span>
									</div>
									<div class="participant-bar">
										<div 
											class="participant-fill"
											style="width: {formatPercentage(count, stats.messageCount)}"
										></div>
									</div>
									<span class="participant-percentage">
										{formatPercentage(count, stats.messageCount)}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--wa-border);
		background: var(--wa-white);
	}

	.chat-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		flex: 1;
		min-width: 0;
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

	.chat-details {
		flex: 1;
		min-width: 0;
	}

	.chat-name {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--wa-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat-meta {
		font-size: 0.85rem;
		color: var(--wa-text-secondary);
	}

	.participants {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		color: var(--wa-text-secondary);
		transition: all var(--transition-fast);
	}

	.action-button:hover,
	.action-button.active {
		background: var(--wa-gray-light);
		color: var(--wa-text-primary);
	}

	.stats-panel {
		border-bottom: 1px solid var(--wa-border);
		background: var(--wa-gray-light);
	}

	.stats-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		padding: var(--spacing-xl);
		color: var(--wa-text-secondary);
	}

	.stats-content {
		padding: var(--spacing-lg);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.participant-stats h4 {
		margin: 0 0 var(--spacing-lg) 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--wa-text-primary);
	}

	.participant-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.participant-stat {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--spacing-md);
		align-items: center;
	}

	.participant-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-width: 0;
	}

	.participant-name {
		font-weight: 500;
		color: var(--wa-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.participant-count {
		font-size: 0.85rem;
		color: var(--wa-text-secondary);
		white-space: nowrap;
		margin-left: var(--spacing-sm);
	}

	.participant-bar {
		height: 6px;
		background: var(--wa-gray-medium);
		border-radius: 3px;
		overflow: hidden;
		flex: 1;
		min-width: 60px;
	}

	.participant-fill {
		height: 100%;
		background: var(--wa-green-primary);
		transition: width var(--transition-normal);
	}

	.participant-percentage {
		font-size: 0.8rem;
		color: var(--wa-text-secondary);
		font-weight: 500;
		min-width: 45px;
		text-align: right;
	}

	@media (max-width: 767px) {
		.chat-header {
			padding: var(--spacing-md);
		}

		.chat-name {
			font-size: 1rem;
		}

		.stats-content {
			padding: var(--spacing-md);
		}

		.stats-grid {
			grid-template-columns: 1fr;
			gap: var(--spacing-md);
		}

		.participant-stat {
			grid-template-columns: 1fr;
			gap: var(--spacing-sm);
		}

		.participant-info {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-xs);
		}
	}
</style>

<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { storeService } from './lib/stores';

	// Global error handling
	onMount(() => {
		// Add global error handler for unhandled JavaScript errors
		window.addEventListener('error', (event) => {
			console.error('GLOBAL ERROR: Unhandled JavaScript error:', event.error);
			console.error('GLOBAL ERROR: Error message:', event.message);
			console.error('GLOBAL ERROR: Error location:', event.filename, 'line:', event.lineno);
			console.error('GLOBAL ERROR: Stack trace:', event.error?.stack);
			
			// Log debug info
			console.log('GLOBAL ERROR: Debug info:', storeService.getDebugInfo());
		});

		// Add global handler for unhandled promise rejections
		window.addEventListener('unhandledrejection', (event) => {
			console.error('GLOBAL ERROR: Unhandled promise rejection:', event.reason);
			console.error('GLOBAL ERROR: Promise:', event.promise);
			
			// Log debug info
			console.log('GLOBAL ERROR: Debug info:', storeService.getDebugInfo());
			
			// Prevent the default behavior of logging to console
			// event.preventDefault();
		});

		// Expose emergency reset function to global scope for debugging
		(window as any).emergencyReset = () => {
			console.log('GLOBAL: Emergency reset triggered from console');
			storeService.emergencyReset();
		};

		// Expose debug info to global scope
		(window as any).getDebugInfo = () => {
			return storeService.getDebugInfo();
		};
	});
</script>

<main>
	<slot />
</main>

<style>
	:global(html) {
		height: 100%;
	}
	
	:global(body) {
		margin: 0;
		padding: 0;
		height: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background: #f0f2f5;
		overflow: hidden;
	}
	
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>

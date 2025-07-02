<script lang="ts">
	import '../app.css';
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

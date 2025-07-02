<script>
	import { onMount } from 'svelte';
	import { storeService } from '$lib/stores';
	import '../app.css';

	onMount(async () => {
		await storeService.init();
	});
</script>

<main>
	<slot />
</main>

<style>
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>

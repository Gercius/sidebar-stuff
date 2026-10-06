<script lang="ts">
	import Sidebar from '../lib/sidebar/Sidebar.svelte';
</script>

<main class="page">
	<header class="page-header">
		<h1>Sidebar builder</h1>
		<p>Drag to move · Double-click to rename</p>
	</header>

	<Sidebar />
</main>

<style>
	.page {
		min-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* justify-content: center; */
		gap: 20px;
		padding: 32px 16px;
	}

	.page-header {
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 600;
	}

	p {
		margin: 6px 0 0;
		color: #626b78;
	}
</style>

<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family:
			-apple-system, blinkmacsystemfont, 'Segoe UI', roboto, helvetica, arial, sans-serif;
		font-size: 14px;
		line-height: 1.4;
		-webkit-font-smoothing: antialiased;
	}

	:global(button, input, select, textarea) {
		font: inherit;
		color: inherit;
	}
</style>

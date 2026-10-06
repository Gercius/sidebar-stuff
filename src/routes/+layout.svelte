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
		color: var(--ui-text);
		background: var(--ui-canvas-bg);
	}

	:global(button, input, select, textarea) {
		font: inherit;
		color: inherit;
	}

	:global(:root) {
		/* Builder chrome variables — separate from the customizable sidebar theme. */
		--ui-canvas-bg: #eceff3;
		--ui-panel-bg: #ffffff;
		--ui-border: #d7dce3;
		--ui-text: #1f2530;
		--ui-text-muted: #6b7482;
		--ui-accent: #2f6fed;
		--ui-radius: 6px;
		--ui-toolbar-height: 48px;
		--ui-panel-width: 280px;
	}
</style>

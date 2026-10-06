<script lang="ts">
	/**
	 * Builder shell: toolbar on top, sidebar preview in the middle, inspector on
	 * the right. The full canvas treatment (background, preview height toggle,
	 * empty state) is task 9 — this is the minimal host that makes the editing
	 * actions of task 5 reachable, plus the keyboard shortcuts.
	 */

	import Inspector from '../lib/builder/Inspector.svelte';
	import ThemePanel from '../lib/builder/ThemePanel.svelte';
	import Toolbar from '../lib/builder/Toolbar.svelte';
	import Sidebar from '../lib/sidebar/components/Sidebar.svelte';
	import { getSidebarStore } from '../lib/sidebar/store.svelte';
	import { getThemeStore } from '../lib/sidebar/theme.svelte';
	import { findItem } from '../lib/sidebar/tree';

	const store = getSidebarStore();
	const theme = getThemeStore();

	/** Which right-hand panel is visible. */
	let panel = $state<'inspector' | 'theme'>('inspector');

	/** True when the event originates from a text field or editable element. */
	function isTyping(event: KeyboardEvent): boolean {
		const target = event.target;
		return (
			target instanceof HTMLElement &&
			(target.closest('input, textarea, select') !== null || target.isContentEditable)
		);
	}

	/** Delete an item, confirming first when it has children. */
	function requestDelete(id: string): void {
		const location = findItem(store.tree, id);
		if (!location) return;
		if (
			location.item.children.length > 0 &&
			!confirm(`Delete "${location.item.label}" and its children?`)
		) {
			return;
		}
		store.remove(id);
	}

	function onKeydown(event: KeyboardEvent): void {
		// Native editing keys (including text undo) win while typing.
		if (isTyping(event)) return;

		const mod = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();

		if (mod && key === 'z' && !event.shiftKey) {
			event.preventDefault();
			store.undo();
			return;
		}
		if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
			event.preventDefault();
			store.redo();
			return;
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			if (store.selectedId !== null) {
				event.preventDefault();
				requestDelete(store.selectedId);
			}
			return;
		}
		if ((event.key === 'F2' || event.key === 'Enter') && store.selectedId !== null) {
			// Let focused buttons keep Enter for themselves.
			const target = event.target;
			if (target instanceof HTMLElement && target.closest('button') !== null) return;
			event.preventDefault();
			store.beginEdit(store.selectedId);
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
	<Toolbar />
	<div class="body">
		<main class="canvas">
			<Sidebar vars={theme.vars} />
		</main>
		<div class="panels">
			<div class="panel-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={panel === 'inspector'}
					class:active={panel === 'inspector'}
					onclick={() => (panel = 'inspector')}
				>
					Item
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={panel === 'theme'}
					class:active={panel === 'theme'}
					onclick={() => (panel = 'theme')}
				>
					Theme
				</button>
			</div>
			{#if panel === 'inspector'}
				<Inspector />
			{:else}
				<ThemePanel />
			{/if}
		</div>
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.body {
		display: grid;
		grid-template-columns: 1fr var(--ui-panel-width);
		flex: 1;
		min-height: 0;
	}

	.canvas {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 32px;
		background: var(--ui-canvas-bg);
		overflow: auto;
	}

	.panels {
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: var(--ui-panel-bg);
	}

	.panel-tabs {
		display: flex;
		flex: 0 0 auto;
		border-bottom: 1px solid var(--ui-border);
	}

	.panel-tabs button {
		flex: 1;
		padding: 8px 10px;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--ui-text-muted);
		font-size: 12px;
		cursor: pointer;
	}

	.panel-tabs button.active {
		border-bottom-color: var(--ui-accent);
		color: var(--ui-text);
	}
</style>

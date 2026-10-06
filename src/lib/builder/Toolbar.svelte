<script lang="ts">
	/**
	 * Builder toolbar. Export / import / reset live in task 8 and are not wired
	 * up yet.
	 */

	import { getSidebarStore } from '../sidebar/store.svelte';

	const store = getSidebarStore();
</script>

<div class="toolbar">
	<button type="button" class="primary" onclick={() => store.add()}>+ Add item</button>
	<span class="spacer"></span>
	<button
		type="button"
		onclick={() => store.undo()}
		disabled={!store.canUndo}
		title="Undo (Ctrl+Z)"
	>
		Undo
	</button>
	<button
		type="button"
		onclick={() => store.redo()}
		disabled={!store.canRedo}
		title="Redo (Ctrl+Shift+Z)"
	>
		Redo
	</button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		height: var(--ui-toolbar-height);
		padding: 0 12px;
		border-bottom: 1px solid var(--ui-border);
		background: var(--ui-panel-bg);
	}

	.spacer {
		flex: 1;
	}

	button {
		padding: 6px 12px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		border-color: var(--ui-accent);
	}

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.primary {
		border-color: var(--ui-accent);
		background: var(--ui-accent);
		color: #fff;
	}
</style>

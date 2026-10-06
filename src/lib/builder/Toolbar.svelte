<script lang="ts">
	/**
	 * Builder toolbar: document actions (add, export, import, copy, reset) plus
	 * the undo/redo history controls. Export / import / copy / reset go through
	 * the persistence layer; a short-lived status message reports the outcome.
	 */

	import {
		applyDocument,
		copyDocumentToClipboard,
		downloadDocument,
		readDocumentFile,
		resetDocument
	} from '../sidebar/persistence';
	import { getSidebarStore } from '../sidebar/store.svelte';
	import { getThemeStore } from '../sidebar/theme.svelte';

	const store = getSidebarStore();
	const theme = getThemeStore();

	/** Hidden file input used by the Import button. */
	let fileInput = $state<HTMLInputElement>();
	/** Transient feedback message shown in the toolbar. */
	let status = $state('');
	let statusTimer: ReturnType<typeof setTimeout> | undefined;

	/** Show a short-lived message next to the document actions. */
	function notify(message: string): void {
		status = message;
		if (statusTimer !== undefined) clearTimeout(statusTimer);
		statusTimer = setTimeout(() => (status = ''), 2500);
	}

	function onExport(): void {
		downloadDocument(store.tree, theme.current);
		notify('Exported JSON');
	}

	async function onCopy(): Promise<void> {
		const ok = await copyDocumentToClipboard(store.tree, theme.current);
		notify(ok ? 'Copied JSON to clipboard' : 'Copy failed');
	}

	function onImportClick(): void {
		fileInput?.click();
	}

	async function onImportFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Clear first so picking the same file again still fires `change`.
		input.value = '';
		if (!file) return;

		const result = await readDocumentFile(file);
		if (!result.ok || !result.document) {
			notify(result.error ?? 'Import failed');
			return;
		}
		applyDocument(store, theme, result.document);
		notify('Imported JSON');
	}

	function onReset(): void {
		if (!confirm('Reset the sidebar and theme to their defaults?')) return;
		resetDocument(store, theme);
		notify('Reset to defaults');
	}
</script>

<div class="toolbar">
	<button type="button" class="primary" onclick={() => store.add()}>+ Add item</button>
	<span class="spacer"></span>
	{#if status}
		<span class="status" role="status">{status}</span>
	{/if}
	<button type="button" onclick={onExport}>Export</button>
	<button type="button" onclick={onImportClick}>Import</button>
	<button type="button" onclick={onCopy}>Copy</button>
	<button type="button" class="danger" onclick={onReset}>Reset</button>
	<span class="divider"></span>
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
	<input
		bind:this={fileInput}
		type="file"
		accept="application/json,.json"
		class="file-input"
		onchange={onImportFile}
	/>
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

	.divider {
		width: 1px;
		height: 20px;
		background: var(--ui-border);
	}

	.status {
		color: var(--ui-text-muted);
		font-size: 12px;
		white-space: nowrap;
	}

	.file-input {
		display: none;
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

	.danger {
		color: #b3261e;
	}
</style>

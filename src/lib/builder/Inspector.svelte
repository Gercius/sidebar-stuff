<script lang="ts">
	/**
	 * Properties panel for the currently selected item: text fields for the
	 * label, link and icon, a collapse toggle and the structural item actions.
	 *
	 * Text fields commit on `change` (blur or Enter) so one edit session is one
	 * undo step; inline row editing handles keystroke-level coalescing instead.
	 */

	import { MAX_DEPTH, levels } from '../sidebar/config';
	import { getSidebarStore } from '../sidebar/store.svelte';
	import { findItem, subtreeHeight } from '../sidebar/tree';

	const store = getSidebarStore();

	const location = $derived(
		store.selectedId === null ? null : findItem(store.tree, store.selectedId)
	);
	const item = $derived(location?.item ?? null);
	/** 1-based depth of the selected item. */
	const depth = $derived(location?.depth ?? 1);

	const hasChildren = $derived((item?.children.length ?? 0) > 0);
	const canAddChild = $derived(depth < MAX_DEPTH && levels[depth - 1]?.canHaveChildren === true);
	const canDuplicate = $derived(item !== null && depth - 1 + subtreeHeight(item) <= MAX_DEPTH);

	function commitLabel(event: Event): void {
		if (!item) return;
		const next = (event.currentTarget as HTMLInputElement).value.trim();
		if (next === '' || next === item.label) return;
		store.update(item.id, { label: next });
	}

	function commitHref(event: Event): void {
		if (!item) return;
		const raw = (event.currentTarget as HTMLInputElement).value.trim();
		const next = raw === '' ? undefined : raw;
		if (next === item.href) return;
		store.update(item.id, { href: next });
	}

	function commitIcon(event: Event): void {
		if (!item) return;
		const raw = (event.currentTarget as HTMLInputElement).value.trim();
		const next = raw === '' ? undefined : raw;
		if (next === item.icon) return;
		store.update(item.id, { icon: next });
	}

	function setCollapsed(event: Event): void {
		if (!item) return;
		store.update(item.id, { collapsed: (event.currentTarget as HTMLInputElement).checked });
	}

	/** Deleting an item with children asks for confirmation first. */
	function requestDelete(): void {
		if (!item) return;
		if (
			hasChildren &&
			!confirm(`Delete "${item.label}" and its ${item.children.length} child item(s)?`)
		) {
			return;
		}
		store.remove(item.id);
	}
</script>

<aside class="inspector">
	{#if item}
		<h2>Item</h2>

		<label class="field">
			<span>Label</span>
			<input type="text" value={item.label} onchange={commitLabel} />
		</label>

		<label class="field">
			<span>Link</span>
			<input type="text" value={item.href ?? ''} placeholder="/path" onchange={commitHref} />
		</label>

		<label class="field">
			<span>Icon</span>
			<input
				type="text"
				value={item.icon ?? ''}
				placeholder="🔗"
				maxlength="4"
				onchange={commitIcon}
			/>
		</label>

		<label class="field checkbox">
			<input
				type="checkbox"
				checked={item.collapsed ?? false}
				disabled={!hasChildren}
				onchange={setCollapsed}
			/>
			<span>Collapsed</span>
		</label>

		<h2>Actions</h2>

		<div class="actions">
			<button type="button" onclick={() => store.addSibling(item.id)}>Add sibling</button>
			<button type="button" onclick={() => store.addChild(item.id)} disabled={!canAddChild}>
				Add child
			</button>
			<button type="button" onclick={() => store.duplicate(item.id)} disabled={!canDuplicate}>
				Duplicate
			</button>
			<button type="button" class="danger" onclick={requestDelete}>Delete</button>
		</div>

		<h2>Move</h2>

		<div class="actions">
			<button
				type="button"
				onclick={() => store.moveUp(item.id)}
				disabled={!store.canMoveUp(item.id)}
			>
				Move up
			</button>
			<button
				type="button"
				onclick={() => store.moveDown(item.id)}
				disabled={!store.canMoveDown(item.id)}
			>
				Move down
			</button>
			<button
				type="button"
				onclick={() => store.indent(item.id)}
				disabled={!store.canIndent(item.id)}
			>
				Indent
			</button>
			<button
				type="button"
				onclick={() => store.outdent(item.id)}
				disabled={!store.canOutdent(item.id)}
			>
				Outdent
			</button>
		</div>

		{#if !canAddChild}
			<p class="hint">No children allowed at this level.</p>
		{/if}
	{:else}
		<p class="hint">Select an item to edit its properties.</p>
	{/if}
</aside>

<style>
	.inspector {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		border-left: 1px solid var(--ui-border);
		background: var(--ui-panel-bg);
		overflow-y: auto;
	}

	h2 {
		margin: 0;
		color: var(--ui-text-muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: var(--ui-text-muted);
	}

	.field input[type='text'] {
		padding: 5px 7px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		color: var(--ui-text);
	}

	.field input[type='text']:focus {
		border-color: var(--ui-accent);
		outline: none;
	}

	.field.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 6px;
		color: var(--ui-text);
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.actions button {
		padding: 6px 8px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		cursor: pointer;
	}

	.actions button:hover:not(:disabled) {
		border-color: var(--ui-accent);
	}

	.actions button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.actions .danger {
		color: #b3261e;
	}

	.hint {
		margin: 0;
		color: var(--ui-text-muted);
		font-size: 12px;
	}
</style>

<script lang="ts">
	import { MAX_DEPTH } from './tree';
	import { draggableItem, dropTargetItem } from './dnd';
	import { store } from './store.svelte';
	import type { SidebarItem as Item } from './types';
	import DropIndicator from './DropIndicator.svelte';
	import SidebarItem from './SidebarItem.svelte';

	interface Props {
		item: Item;
		depth: number;
	}

	let { item, depth }: Props = $props();

	const hasChildren = $derived(item.children.length > 0);
	const collapsed = $derived(item.collapsed ?? false);
	const editing = $derived(store.editingId === item.id);
	const dragging = $derived(store.dndSourceId === item.id);
	const dropPosition = $derived(store.dndTargetId === item.id ? store.dndTargetPosition : null);
	const canAddChild = $derived(depth + 1 < MAX_DEPTH);

	let draft = $state('');
	let originalLabel = $state('');
	let editFinished = false;

	function beginEdit(): void {
		if (editing) return;
		store.editingId = item.id;
	}

	function attachEditor(element: HTMLInputElement): void {
		draft = item.label;
		originalLabel = item.label;
		editFinished = false;
		element.value = item.label;
		element.focus();
		element.select();
	}

	function commitEdit(): void {
		if (editFinished) return;
		editFinished = true;
		store.rename(item.id, draft.trim() ? draft : originalLabel);
	}

	function cancelEdit(): void {
		if (editFinished) return;
		editFinished = true;
		store.editingId = null;
	}

	function onEditKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (event.key === 'Enter') {
			event.preventDefault();
			commitEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	function onLabelKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		beginEdit();
	}

	function deleteItem(): void {
		if (hasChildren && !window.confirm(`Delete “${item.label}” and its children?`)) return;
		store.remove(item.id);
	}
</script>

<li class="item">
	<div
		class="row"
		class:dragging
		style:padding-left={`${depth * 16}px`}
		{@attach draggableItem(item.id, () => item.label)}
		{@attach dropTargetItem(item.id, depth)}
	>
		{#if hasChildren}
			<button
				class="chevron"
				class:open={!collapsed}
				type="button"
				onclick={() => store.toggle(item.id)}
				aria-label={collapsed ? `Expand ${item.label}` : `Collapse ${item.label}`}
				aria-expanded={!collapsed}
			>
				<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
					<path
						d="M6 4l4 4-4 4"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{:else}
			<span class="chevron-spacer" aria-hidden="true"></span>
		{/if}

		{#if editing}
			<input
				class="label-input"
				{@attach attachEditor}
				value={draft}
				oninput={(event) => (draft = event.currentTarget.value)}
				onkeydown={onEditKeydown}
				onblur={commitEdit}
				aria-label="Item label"
			/>
		{:else}
			<button
				class="label"
				type="button"
				ondblclick={beginEdit}
				onkeydown={onLabelKeydown}
				aria-label={`Rename ${item.label}`}
			>
				{item.label}
			</button>
		{/if}

		<span class="actions">
			<span class="drag-handle" data-drag-handle aria-hidden="true" title="Drag to move">⠿</span>
			{#if canAddChild}
				<button
					class="action"
					type="button"
					onclick={() => store.add(item.id)}
					aria-label={`Add child to ${item.label}`}
					title="Add child"
				>
					+
				</button>
			{/if}
			<button
				class="action"
				type="button"
				onclick={deleteItem}
				aria-label={`Delete ${item.label}`}
				title="Delete item"
			>
				×
			</button>
		</span>

		{#if dropPosition}
			<DropIndicator position={dropPosition} indent={depth * 16} />
		{/if}
	</div>

	{#if hasChildren && !collapsed}
		<ul class="children">
			{#each item.children as child (child.id)}
				<SidebarItem item={child} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	.item {
		list-style: none;
	}

	.row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 2px;
		min-height: 30px;
		padding: 4px 6px 4px 0;
		border-radius: 4px;
	}

	.row:hover {
		background: #f1f3f7;
	}

	.row.dragging {
		opacity: 0.45;
	}

	.chevron,
	.chevron-spacer {
		flex: 0 0 20px;
		width: 20px;
		height: 20px;
	}

	.chevron {
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.chevron svg {
		transition: transform 0.12s ease;
	}

	.chevron.open svg {
		transform: rotate(90deg);
	}

	.label,
	.label-input {
		flex: 1;
		min-width: 0;
		padding: 2px 4px;
		border: 0;
		border-radius: 3px;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
	}

	.label {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		cursor: default;
	}

	.label-input {
		border: 1px solid #4c7cf3;
		background: #fff;
		outline: none;
	}

	.actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.12s ease;
	}

	.row:hover .actions,
	.row:focus-within .actions {
		opacity: 1;
	}

	.drag-handle {
		display: grid;
		place-items: center;
		width: 16px;
		height: 20px;
		color: #687385;
		user-select: none;
		cursor: grab;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.action {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #687385;
		font: inherit;
		line-height: 1;
		cursor: pointer;
	}

	.action:hover,
	.chevron:hover {
		background: rgb(0 0 0 / 0.06);
		color: #1f2530;
	}

	.children {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>

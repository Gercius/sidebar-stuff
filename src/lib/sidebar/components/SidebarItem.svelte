<script lang="ts">
	/**
	 * Recursive sidebar row. Renders one item, its per-level typography, the
	 * builder-only selection highlight and hover affordances, then recurses into
	 * children when expanded.
	 */

	import { MAX_DEPTH, levels } from '../config';
	import { getSidebarStore } from '../store.svelte';
	import type { SidebarItem as Item } from '../types';
	import SidebarItem from './SidebarItem.svelte';

	interface Props {
		/** The item to render. */
		item: Item;
		/** Zero-based nesting depth, used to look up `levels[depth]`. */
		depth: number;
		/** Invoked when the "⋯" affordance is activated. */
		onMenu?: (item: Item) => void;
	}

	let { item, depth, onMenu }: Props = $props();

	const store = getSidebarStore();

	/** Per-level presentation for this depth. */
	const level = $derived(levels[depth] ?? levels[levels.length - 1]);
	const hasChildren = $derived(item.children.length > 0);
	const collapsed = $derived(item.collapsed ?? false);
	const selected = $derived(store.selectedId === item.id);
	/** Children are only allowed where the level permits and depth stays in range. */
	const canAddChild = $derived(levels[depth]?.canHaveChildren === true && depth + 1 < MAX_DEPTH);

	/** Left padding combines the level indent with the base item padding. */
	const indent = $derived(`${level.indent + 8}px`);
</script>

<li class="item">
	<div class="row" class:selected style:padding-left={indent}>
		{#if hasChildren}
			<button
				class="chevron"
				class:open={!collapsed}
				onclick={() => store.toggleCollapse(item.id)}
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

		<button
			class="main"
			onclick={() => store.select(item.id)}
			aria-current={selected ? 'true' : undefined}
			style:font-size={`${level.fontSize}px`}
			style:font-weight={level.fontWeight}
		>
			{#if item.icon}
				<span class="icon" aria-hidden="true">{item.icon}</span>
			{/if}
			<span class="label">{item.label}</span>
		</button>

		<span class="actions">
			<span class="drag-handle" data-drag-handle aria-hidden="true" title="Drag to reorder">⠿</span>
			{#if canAddChild}
				<button
					class="action"
					onclick={() => store.addChild(item.id)}
					aria-label={`Add child to ${item.label}`}
					title="Add child"
				>
					+
				</button>
			{/if}
			<button
				class="action"
				onclick={() => {
					store.select(item.id);
					onMenu?.(item);
				}}
				aria-label={`More actions for ${item.label}`}
				title="More actions"
			>
				⋯
			</button>
		</span>
	</div>

	{#if hasChildren && !collapsed}
		<ul class="children">
			{#each item.children as child (child.id)}
				<SidebarItem item={child} depth={depth + 1} {onMenu} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	.item {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: var(--sb-item-padding);
		border-radius: var(--sb-item-radius);
		color: var(--sb-item-color);
	}

	.row:hover {
		background: var(--sb-item-hover-bg);
	}

	/* Selection is builder chrome, deliberately independent of the sidebar theme. */
	.row.selected {
		background: var(--sb-item-active-bg);
		outline: 2px solid var(--ui-accent);
		outline-offset: -2px;
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
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--ui-text-muted);
		cursor: pointer;
	}

	.chevron svg {
		transition: transform 0.12s ease;
	}

	.chevron.open svg {
		transform: rotate(90deg);
	}

	.chevron:hover {
		background: rgb(0 0 0 / 0.06);
		color: var(--ui-text);
	}

	.main {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.icon {
		flex: 0 0 auto;
		line-height: 1;
	}

	.label {
		flex: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
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
	.row:focus-within .actions,
	.row.selected .actions {
		opacity: 1;
	}

	.drag-handle {
		display: grid;
		place-items: center;
		width: 16px;
		height: 20px;
		color: var(--ui-text-muted);
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
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--ui-text-muted);
		line-height: 1;
		cursor: pointer;
	}

	.action:hover {
		background: rgb(0 0 0 / 0.06);
		color: var(--ui-text);
	}

	.children {
		display: flex;
		flex-direction: column;
		gap: var(--sb-item-gap);
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>

<script lang="ts">
	/**
	 * Drop feedback for a single row. `before` / `after` render a horizontal line
	 * (offset to the row's indent); `inside` outlines the whole row. Purely
	 * decorative and pointer-transparent so it never interferes with the drag.
	 */

	import type { DropPosition } from './tree';

	interface Props {
		/** Where a dragged item would land relative to the host row. */
		position: DropPosition;
		/** Left offset in px so reorder lines line up with the item indent. */
		indent?: number;
	}

	let { position, indent = 0 }: Props = $props();
</script>

{#if position === 'inside'}
	<span class="combine" aria-hidden="true"></span>
{:else}
	<span class="line {position}" style:left={`${indent}px`} aria-hidden="true"></span>
{/if}

<style>
	.combine {
		position: absolute;
		inset: 0;
		border: 2px solid var(--ui-accent);
		border-radius: var(--sb-item-radius);
		pointer-events: none;
	}

	.line {
		position: absolute;
		right: 8px;
		height: 2px;
		border-radius: 2px;
		background: var(--ui-accent);
		pointer-events: none;
	}

	.line.before {
		top: -2px;
	}

	.line.after {
		bottom: -2px;
	}
</style>

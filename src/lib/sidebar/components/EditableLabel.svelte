<script lang="ts">
	/**
	 * Inline label editor, mounted by `SidebarItem` while `store.editingId`
	 * matches the row.
	 *
	 * Keystrokes are written to the tree transiently so the preview follows the
	 * input; the whole session is closed with a single `store.endEdit` call, so
	 * one inline edit becomes one undo step. Enter or blur commits, Escape
	 * restores the pre-edit snapshot.
	 *
	 * The DOM input owns the text while editing (no `value` attribute is bound),
	 * which keeps the caret and selection under the browser's control.
	 */

	import { getSidebarStore } from '../store.svelte';
	import type { SidebarItem } from '../types';

	interface Props {
		/** Item whose label is being edited. */
		item: SidebarItem;
	}

	let { item }: Props = $props();

	const store = getSidebarStore();

	let input = $state<HTMLInputElement | null>(null);
	/** Guards the one-time setup and stops the trailing blur from double-committing. */
	let finished = false;

	$effect(() => {
		const el = input;
		if (!el || finished) return;
		el.value = item.label;
		el.focus();
		el.select();
	});

	function onInput(event: Event): void {
		const next = (event.currentTarget as HTMLInputElement).value;
		// Blank labels are not allowed: the tree keeps its current text.
		if (next.trim() === '') return;
		store.update(item.id, { label: next }, { transient: true });
	}

	function commit(): void {
		if (finished) return;
		finished = true;
		store.endEdit(true);
	}

	function cancel(): void {
		if (finished) return;
		finished = true;
		store.endEdit(false);
	}

	function onKeydown(event: KeyboardEvent): void {
		// Keep page-level builder shortcuts out of the input.
		event.stopPropagation();
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	}
</script>

<input
	class="editable-label"
	bind:this={input}
	oninput={onInput}
	onkeydown={onKeydown}
	onblur={commit}
	onclick={(event) => event.stopPropagation()}
	ondblclick={(event) => event.stopPropagation()}
	onpointerdown={(event) => event.stopPropagation()}
	aria-label="Item label"
/>

<style>
	.editable-label {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 1px 4px;
		border: 1px solid var(--ui-accent);
		border-radius: 4px;
		background: #fff;
		color: inherit;
		font: inherit;
		line-height: inherit;
		outline: none;
	}
</style>

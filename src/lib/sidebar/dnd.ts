/**
 * Drag & drop wiring built on pragmatic-drag-and-drop (v4) plus its list-item
 * hitbox. Exposed as Svelte {@attach} helpers so components stay declarative:
 *
 * - {@link draggableItem} makes a row (via its drag handle) draggable.
 * - {@link dropTargetItem} turns a row into a drop target that publishes a
 *   `reorder-before` / `reorder-after` / `combine` instruction.
 * - {@link dndMonitor} listens globally, drives the transient feedback state and
 *   commits the move with a single undo entry.
 *
 * Invalid operations (own subtree, `MAX_DEPTH` overflow, `!canHaveChildren`) are
 * filtered through the hitbox `operations` availability so the UI only ever
 * advertises drop zones that would actually succeed.
 */

import {
	draggable,
	dropTargetForElements,
	monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import {
	attachInstruction,
	extractInstruction,
	type Availability,
	type Instruction,
	type Operation
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview';
import type { Attachment } from 'svelte/attachments';
import { MAX_DEPTH, levels } from './config';
import { getSidebarStore, type SidebarStore } from './store.svelte';
import { findItem, isDescendant, subtreeHeight, type DropPosition } from './tree';

/** Marks the data attached to a dragged sidebar item. */
const ITEM_TYPE = 'sidebar-item';

/** Marks the data attached to a sidebar row acting as a drop target. */
const TARGET_TYPE = 'sidebar-item-target';

/** How long a `combine` hover must last before a collapsed item auto-expands. */
const AUTO_EXPAND_DELAY = 500;

/** Minimal shape of a drop target record, enough to read its attached data. */
type TargetSnapshot = { data: Record<string | symbol, unknown> };

/** The `Position` a hitbox operation maps to in the tree helpers. */
function positionOf(operation: Operation): DropPosition {
	if (operation === 'combine') return 'inside';
	return operation === 'reorder-before' ? 'before' : 'after';
}

const NONE: Availability = 'not-available';

/**
 * Which hitbox operations are offered for `targetId` given the dragged
 * `sourceId`. `targetDepth` is the target's zero-based component depth.
 */
function operationsFor(
	store: SidebarStore,
	sourceId: string,
	targetId: string,
	targetDepth: number
): Record<Operation, Availability> {
	// Never drop onto the item being dragged.
	if (sourceId === targetId) {
		return { 'reorder-before': NONE, 'reorder-after': NONE, combine: NONE };
	}

	// Dropping into own subtree is shown as explicitly blocked.
	if (isDescendant(store.tree, sourceId, targetId)) {
		return { 'reorder-before': 'blocked', 'reorder-after': 'blocked', combine: 'blocked' };
	}

	const source = findItem(store.tree, sourceId);
	if (!source) {
		return { 'reorder-before': NONE, 'reorder-after': NONE, combine: NONE };
	}

	const height = subtreeHeight(source.item);
	const targetDepth1 = targetDepth + 1;

	// before/after keep the target's depth; combine nests one level deeper.
	const canReorder = targetDepth1 + height - 1 <= MAX_DEPTH;
	const canCombine =
		levels[targetDepth]?.canHaveChildren === true && targetDepth1 + height <= MAX_DEPTH;

	return {
		'reorder-before': canReorder ? 'available' : NONE,
		'reorder-after': canReorder ? 'available' : NONE,
		combine: canCombine ? 'available' : NONE
	};
}

/** Inline styles for the custom drag preview chip. */
const PREVIEW_STYLE: Partial<CSSStyleDeclaration> = {
	padding: '6px 10px',
	border: '1px solid #d7dce3',
	borderRadius: '6px',
	background: '#fff',
	color: '#1f2530',
	font: '500 13px/1.3 -apple-system, blinkmacsystemfont, "Segoe UI", roboto, sans-serif',
	boxShadow: '0 4px 12px rgb(0 0 0 / 0.18)',
	maxWidth: '240px',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

let autoExpandId: string | null = null;
let autoExpandTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel a pending auto-expand (drag left the combine zone or the drag ended). */
function clearAutoExpand(): void {
	if (autoExpandTimer !== null) {
		clearTimeout(autoExpandTimer);
		autoExpandTimer = null;
	}
	autoExpandId = null;
}

/**
 * Expand a collapsed item ~500ms after it becomes the active `combine` target.
 * The change is transient (no history entry) because the following move is the
 * action worth undoing.
 */
function scheduleAutoExpand(store: SidebarStore, id: string): void {
	if (autoExpandId === id) return;
	clearAutoExpand();

	const location = findItem(store.tree, id);
	if (!location || location.item.collapsed !== true || location.item.children.length === 0) return;

	autoExpandId = id;
	autoExpandTimer = setTimeout(() => {
		autoExpandTimer = null;
		autoExpandId = null;
		const current = findItem(store.tree, id);
		if (current && current.item.collapsed === true && current.item.children.length > 0) {
			store.update(id, { collapsed: false }, { transient: true });
		}
	}, AUTO_EXPAND_DELAY);
}

/** Push the drop feedback for the outermost active target into the store. */
function updateFeedback(store: SidebarStore, target: TargetSnapshot | null): void {
	if (!target) {
		store.setDndTarget(null, null);
		clearAutoExpand();
		return;
	}

	const instruction = extractInstruction(target.data);
	const targetId = target.data.id;
	if (!instruction || instruction.blocked || typeof targetId !== 'string') {
		store.setDndTarget(null, null);
		clearAutoExpand();
		return;
	}

	store.setDndTarget(targetId, positionOf(instruction.operation));
	if (instruction.operation === 'combine') scheduleAutoExpand(store, targetId);
	else clearAutoExpand();
}

/**
 * Make a row draggable. `id` and `getLabel` are read lazily so the data attached
 * to the drag and the preview always reflect the current item.
 */
export function draggableItem(id: string, getLabel: () => string): Attachment<HTMLElement> {
	return (element) => {
		const dragHandle = element.querySelector<HTMLElement>('[data-drag-handle]') ?? undefined;

		return draggable({
			element,
			dragHandle,
			getInitialData: () => ({ type: ITEM_TYPE, id }),
			onGenerateDragPreview: ({ nativeSetDragImage }) => {
				setCustomNativeDragPreview({
					nativeSetDragImage,
					render: ({ container }) => {
						container.style.pointerEvents = 'none';
						const preview = document.createElement('div');
						preview.textContent = getLabel();
						Object.assign(preview.style, PREVIEW_STYLE);
						container.appendChild(preview);
						return () => preview.remove();
					}
				});
			}
		});
	};
}

/**
 * Turn a row into a drop target. `depth` is the row's zero-based component depth
 * and drives the depth-limit checks in {@link operationsFor}.
 */
export function dropTargetItem(id: string, depth: number): Attachment<HTMLElement> {
	return (element) => {
		const store = getSidebarStore();

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => source.data.type === ITEM_TYPE,
			getData: ({ input, element: current, source }) => {
				const sourceId = typeof source.data.id === 'string' ? source.data.id : null;
				const operations = sourceId
					? operationsFor(store, sourceId, id, depth)
					: { 'reorder-before': NONE, 'reorder-after': NONE, combine: NONE };

				return attachInstruction(
					{ type: TARGET_TYPE, id },
					{ input, element: current, operations, axis: 'vertical' }
				);
			}
		});
	};
}

/**
 * Global drag monitor. Attach once to any element that stays mounted for the
 * lifetime of the editor: it tracks the dragged source, keeps the indicator
 * state in sync and commits the final move as one undo step.
 */
export function dndMonitor(): Attachment<HTMLElement> {
	return () => {
		const store = getSidebarStore();

		return monitorForElements({
			canMonitor: ({ source }) => source.data.type === ITEM_TYPE,
			onDragStart: ({ source }) => {
				if (typeof source.data.id === 'string') store.setDndSource(source.data.id);
			},
			onDrag: ({ location }) => {
				updateFeedback(store, location.current.dropTargets[0] ?? null);
			},
			onDrop: ({ source, location }) => {
				clearAutoExpand();
				store.clearDnd();

				const sourceId = source.data.id;
				const target: TargetSnapshot | undefined = location.current.dropTargets[0];
				if (typeof sourceId !== 'string' || !target) return;

				const instruction: Instruction | null = extractInstruction(target.data);
				const targetId = target.data.id;
				if (!instruction || instruction.blocked || typeof targetId !== 'string') return;

				store.move(sourceId, targetId, positionOf(instruction.operation));
			}
		});
	};
}

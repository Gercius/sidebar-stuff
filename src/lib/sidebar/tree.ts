import { MAX_DEPTH, levels } from './config';
import type { SidebarItem } from './types';

/** Where an item is dropped relative to its target. */
export type DropPosition = 'before' | 'after' | 'inside';

/** Result of locating an item inside a tree. */
export interface ItemLocation {
	/** The matched item. */
	item: SidebarItem;
	/** Owning item, or `null` when the item sits at the top level. */
	parent: SidebarItem | null;
	/** Index within the parent's children (or the root array). */
	index: number;
	/** 1-based depth. Top-level items are at depth 1. */
	depth: number;
}

/** Generate a unique id for a new item. */
export function createId(): string {
	const cryptoObj = globalThis.crypto;
	if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
		return cryptoObj.randomUUID();
	}
	return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Find an item anywhere in the tree, with its parent, index and depth. */
export function findItem(tree: SidebarItem[], id: string): ItemLocation | null {
	return findIn(tree, null, 1, id);
}

function findIn(
	items: SidebarItem[],
	parent: SidebarItem | null,
	depth: number,
	id: string
): ItemLocation | null {
	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		if (item.id === id) return { item, parent, index, depth };
		const nested = findIn(item.children, item, depth + 1, id);
		if (nested) return nested;
	}
	return null;
}

/** Remove an item (and its subtree) from the tree. Returns the removed item. */
export function removeItem(tree: SidebarItem[], id: string): SidebarItem | null {
	const location = findItem(tree, id);
	if (!location) return null;
	const siblings = location.parent ? location.parent.children : tree;
	siblings.splice(location.index, 1);
	return location.item;
}

/** Insert an item into `parentId`'s children (or the root when `null`) at `index`. */
export function insertItem(
	tree: SidebarItem[],
	parentId: string | null,
	index: number,
	item: SidebarItem
): void {
	let siblings: SidebarItem[];
	if (parentId === null) {
		siblings = tree;
	} else {
		const parent = findItem(tree, parentId);
		if (!parent) return;
		siblings = parent.item.children;
	}
	const at = Math.max(0, Math.min(index, siblings.length));
	siblings.splice(at, 0, item);
}

/** True when `id` is a strict descendant of `ancestorId`. */
export function isDescendant(tree: SidebarItem[], ancestorId: string, id: string): boolean {
	const ancestor = findItem(tree, ancestorId);
	if (!ancestor) return false;
	return containsId(ancestor.item.children, id);
}

function containsId(items: SidebarItem[], id: string): boolean {
	for (const item of items) {
		if (item.id === id) return true;
		if (containsId(item.children, id)) return true;
	}
	return false;
}

/** Number of levels occupied by an item's subtree. A leaf is 1. */
export function subtreeHeight(item: SidebarItem): number {
	let max = 0;
	for (const child of item.children) {
		const height = subtreeHeight(child);
		if (height > max) max = height;
	}
	return max + 1;
}

/**
 * Whether `sourceId` can be dropped relative to `targetId` without producing an
 * invalid tree: no self/descendant drops, no drops past `MAX_DEPTH`, and no
 * children on levels that forbid them.
 */
export function canDrop(
	tree: SidebarItem[],
	sourceId: string,
	targetId: string | null,
	position: DropPosition
): boolean {
	const source = findItem(tree, sourceId);
	if (!source) return false;

	// Never drop an item into itself or into its own subtree.
	if (targetId !== null && (targetId === sourceId || isDescendant(tree, sourceId, targetId))) {
		return false;
	}

	const height = subtreeHeight(source.item);

	if (position === 'inside') {
		// Dropping into the root makes the subtree top-level.
		if (targetId === null) return height <= MAX_DEPTH;
		const target = findItem(tree, targetId);
		if (!target) return false;
		if (!levels[target.depth - 1]?.canHaveChildren) return false;
		return target.depth + height <= MAX_DEPTH;
	}

	// before / after keep the target's depth.
	const targetDepth = targetId === null ? 1 : findItem(tree, targetId)?.depth;
	if (targetDepth === undefined) return false;
	return targetDepth + height - 1 <= MAX_DEPTH;
}

/**
 * Move an item next to or inside another item. Returns `false` (leaving the
 * tree untouched) when the move would be invalid.
 */
export function moveItem(
	tree: SidebarItem[],
	id: string,
	target: string | null,
	position: DropPosition
): boolean {
	if (!canDrop(tree, id, target, position)) return false;
	const item = removeItem(tree, id);
	if (!item) return false;

	let parentId: string | null = null;
	let index: number;

	if (position === 'inside') {
		parentId = target;
		index = target === null ? tree.length : (findItem(tree, target)?.item.children.length ?? 0);
	} else if (target === null) {
		index = position === 'before' ? 0 : tree.length;
	} else {
		const located = findItem(tree, target);
		if (!located) {
			tree.push(item);
			return false;
		}
		parentId = located.parent ? located.parent.id : null;
		index = position === 'before' ? located.index : located.index + 1;
	}

	insertItem(tree, parentId, index, item);
	return true;
}

/** Deep-clone an item and every descendant, assigning fresh ids. */
export function cloneWithNewIds(item: SidebarItem): SidebarItem {
	return {
		...item,
		id: createId(),
		children: item.children.map(cloneWithNewIds)
	};
}

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

/** Result of removing an item without mutating the source tree. */
export interface RemoveItemResult {
	tree: SidebarItem[];
	item: SidebarItem;
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

/** Deep-clone a tree while preserving every item id. */
export function cloneTree(tree: SidebarItem[]): SidebarItem[] {
	return tree.map((item) => ({ ...item, children: cloneTree(item.children) }));
}

/** Remove an item (and its subtree) without mutating the source tree. */
export function removeItem(tree: SidebarItem[], id: string): RemoveItemResult | null {
	const next = cloneTree(tree);
	const location = findItem(next, id);
	if (!location) return null;
	const siblings = location.parent ? location.parent.children : next;
	const [item] = siblings.splice(location.index, 1);
	return { tree: next, item };
}

/** Insert an item without mutating the source tree. */
export function insertItem(
	tree: SidebarItem[],
	parentId: string | null,
	index: number,
	item: SidebarItem
): SidebarItem[] | null {
	const next = cloneTree(tree);
	let siblings: SidebarItem[];
	if (parentId === null) {
		siblings = next;
	} else {
		const parent = findItem(next, parentId);
		if (!parent) return null;
		siblings = parent.item.children;
	}
	const at = Math.max(0, Math.min(index, siblings.length));
	siblings.splice(at, 0, cloneTree([item])[0]);
	return next;
}

/** Replace one item without mutating the source tree. */
export function updateItem(
	tree: SidebarItem[],
	id: string,
	update: (item: SidebarItem) => SidebarItem
): SidebarItem[] | null {
	const next = cloneTree(tree);
	const location = findItem(next, id);
	if (!location) return null;

	Object.assign(location.item, update(location.item));
	return next;
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
 * Move an item next to or inside another item. Returns a new tree, or `null`
 * when the move would be invalid.
 */
export function moveItem(
	tree: SidebarItem[],
	id: string,
	target: string | null,
	position: DropPosition
): SidebarItem[] | null {
	if (!canDrop(tree, id, target, position)) return null;
	const removed = removeItem(tree, id);
	if (!removed) return null;
	const { item } = removed;
	const next = removed.tree;

	let parentId: string | null = null;
	let index: number;

	if (position === 'inside') {
		parentId = target;
		index = target === null ? next.length : (findItem(next, target)?.item.children.length ?? 0);
	} else if (target === null) {
		index = position === 'before' ? 0 : next.length;
	} else {
		const located = findItem(next, target);
		if (!located) return null;
		parentId = located.parent ? located.parent.id : null;
		index = position === 'before' ? located.index : located.index + 1;
	}

	return insertItem(next, parentId, index, item);
}

/** Deep-clone an item and every descendant, assigning fresh ids. */
export function cloneWithNewIds(item: SidebarItem): SidebarItem {
	return {
		...item,
		id: createId(),
		children: item.children.map(cloneWithNewIds)
	};
}

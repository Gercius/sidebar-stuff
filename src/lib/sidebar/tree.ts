import type { SidebarItem } from './types';

export const MAX_DEPTH = 4;

/** Where an item is dropped relative to its target. */
export type DropPosition = 'before' | 'after' | 'inside';

/** Result of locating an item inside a tree. */
export interface ItemLocation {
	item: SidebarItem;
	parent: SidebarItem | null;
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

/** Create the small example tree shown in the rewrite plan. */
export function createSampleTree(): SidebarItem[] {
	const item = (label: string, children: SidebarItem[] = []): SidebarItem => ({
		id: createId(),
		label,
		children
	});

	return [
		item('Link'),
		item('Link', [item('Sublink'), item('Sublink')]),
		item('Link'),
		item('Link')
	];
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

/** Remove an item (and its subtree) without mutating the source tree. */
export function removeItem(tree: SidebarItem[], id: string): RemoveItemResult | null {
	const result = removeFrom(tree, id);
	return result ? { tree: result.items, item: result.item } : null;
}

function removeFrom(
	items: SidebarItem[],
	id: string
): { items: SidebarItem[]; item: SidebarItem } | null {
	for (let index = 0; index < items.length; index++) {
		const current = items[index];
		if (current.id === id) {
			const next = items.slice();
			const [item] = next.splice(index, 1);
			return { items: next, item };
		}

		const nested = removeFrom(current.children, id);
		if (nested) {
			const next = items.slice();
			next[index] = { ...current, children: nested.items };
			return { items: next, item: nested.item };
		}
	}
	return null;
}

/** Insert an item without mutating the source tree. */
export function insertItem(
	tree: SidebarItem[],
	parentId: string | null,
	index: number,
	item: SidebarItem
): SidebarItem[] | null {
	if (parentId === null) return insertAt(tree, index, item);
	return insertInto(tree, parentId, index, item);
}

function insertAt(items: SidebarItem[], index: number, item: SidebarItem): SidebarItem[] {
	const next = items.slice();
	const at = Math.max(0, Math.min(index, next.length));
	next.splice(at, 0, item);
	return next;
}

function insertInto(
	items: SidebarItem[],
	parentId: string,
	index: number,
	item: SidebarItem
): SidebarItem[] | null {
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const current = items[itemIndex];
		if (current.id === parentId) {
			const next = items.slice();
			next[itemIndex] = {
				...current,
				children: insertAt(current.children, index, item)
			};
			return next;
		}

		const children = insertInto(current.children, parentId, index, item);
		if (children) {
			const next = items.slice();
			next[itemIndex] = { ...current, children };
			return next;
		}
	}
	return null;
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

/** Move an item next to or inside another item without mutating the source tree. */
export function moveItem(
	tree: SidebarItem[],
	id: string,
	target: string | null,
	position: DropPosition
): SidebarItem[] | null {
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

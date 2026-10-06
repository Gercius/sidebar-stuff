import {
	createSampleTree,
	createId,
	findItem,
	moveItem,
	removeItem,
	subtreeHeight,
	MAX_DEPTH,
	type DropPosition
} from './tree';
import type { SidebarItem } from './types';

const DEFAULT_LABEL = 'New link';
let tree = $state<SidebarItem[]>(createSampleTree());
let editingId = $state<string | null>(null);
let dndSourceId = $state<string | null>(null);
let dndTargetId = $state<string | null>(null);
let dndTargetPosition = $state<DropPosition | null>(null);

/** Shared sidebar state and the actions that mutate it. */
export const store = {
	get tree() {
		return tree;
	},
	get editingId() {
		return editingId;
	},
	set editingId(id: string | null) {
		editingId = id;
	},
	get dndSourceId() {
		return dndSourceId;
	},
	get dndTargetId() {
		return dndTargetId;
	},
	get dndTargetPosition() {
		return dndTargetPosition;
	},

	/** Add a top-level item, or append a child to `parentId`. */
	add(parentId: string | null): SidebarItem | null {
		const item: SidebarItem = { id: createId(), label: DEFAULT_LABEL, children: [] };

		if (parentId === null) {
			tree.push(item);
		} else {
			const parent = findItem(tree, parentId);
			if (!parent || parent.depth >= MAX_DEPTH) return null;
			parent.item.children.push(item);
			parent.item.collapsed = false;
		}

		editingId = item.id;
		return item;
	},

	/** Remove an item and its descendants. */
	remove(id: string): boolean {
		const location = findItem(tree, id);
		if (!location) return false;

		const removed = removeItem(tree, id);
		if (!removed) return false;
		tree = removed.tree;

		if (editingId && (editingId === id || isWithin(location.item, editingId))) {
			editingId = null;
		}
		return true;
	},

	/** Rename an item and leave edit mode. */
	rename(id: string, label: string): boolean {
		const location = findItem(tree, id);
		if (!location) return false;
		location.item.label = label;
		if (editingId === id) editingId = null;
		return true;
	},

	/** Move an item before, after, or inside another item, respecting max depth. */
	move(sourceId: string, targetId: string, position: DropPosition): boolean {
		if (sourceId === targetId || isDescendant(tree, sourceId, targetId)) return false;

		const source = findItem(tree, sourceId);
		if (!source) return false;

		const next = moveItem(tree, sourceId, targetId, position);
		if (!next) return false;

		const moved = findItem(next, sourceId);
		if (!moved || moved.depth - 1 + subtreeHeight(source.item) > MAX_DEPTH) return false;

		tree = next;
		if (position === 'inside') {
			const parent = findItem(tree, targetId);
			if (parent) parent.item.collapsed = false;
		}
		return true;
	},

	/** Toggle an item's collapsed state when it has children. */
	toggle(id: string): boolean {
		const location = findItem(tree, id);
		if (!location || location.item.children.length === 0) return false;
		location.item.collapsed = !location.item.collapsed;
		return true;
	},

	/** Expand an item, used when a drag hovers over a collapsed parent. */
	expand(id: string): boolean {
		const location = findItem(tree, id);
		if (!location || location.item.children.length === 0) return false;
		location.item.collapsed = false;
		return true;
	},

	setDndSource(id: string | null): void {
		dndSourceId = id;
	},

	setDndTarget(id: string | null, position: DropPosition | null): void {
		dndTargetId = id;
		dndTargetPosition = position;
	},

	clearDnd(): void {
		dndSourceId = null;
		dndTargetId = null;
		dndTargetPosition = null;
	}
};

function isDescendant(tree: SidebarItem[], ancestorId: string, id: string): boolean {
	const ancestor = findItem(tree, ancestorId);
	if (!ancestor) return false;
	return isWithin(ancestor.item, id);
}

function isWithin(item: SidebarItem, id: string): boolean {
	return item.children.some((child) => child.id === id || isWithin(child, id));
}

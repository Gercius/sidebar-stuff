/**
 * Single source of truth for the builder: the item tree, the current
 * selection/editing state and a capped undo/redo history.
 *
 * Mutating actions snapshot the tree *before* they change it, so `undo()`
 * restores the previous document. Inline label edits are coalesced into one
 * history entry by wrapping them in a {@link SidebarStore.beginEdit} /
 * {@link SidebarStore.endEdit} session.
 */

import { getContext, hasContext, setContext } from 'svelte';
import { MAX_DEPTH, createSampleTree, levels } from './config';
import {
	canDrop,
	cloneWithNewIds,
	createId,
	findItem,
	insertItem,
	moveItem,
	removeItem,
	subtreeHeight,
	type DropPosition
} from './tree';
import type { SidebarItem } from './types';

/** Maximum number of undo steps kept in memory. */
const HISTORY_LIMIT = 100;

/** Label assigned to freshly created items. */
const DEFAULT_LABEL = 'New item';

/** Fields an item patch may change. `id` and `children` are managed by the store. */
export type SidebarItemPatch = Partial<Omit<SidebarItem, 'id' | 'children'>>;

/** Options for {@link SidebarStore.update}. */
export interface UpdateOptions {
	/** Skip the history entry (used for keystroke-level edits inside an edit session). */
	transient?: boolean;
}

/** Structural comparison of two trees. */
function treeEquals(a: SidebarItem[], b: SidebarItem[]): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export class SidebarStore {
	/** The sidebar tree. Mutated in place by the pure tree helpers. */
	tree = $state<SidebarItem[]>(createSampleTree());
	/** Id of the currently selected item, or `null`. */
	selectedId = $state<string | null>(null);
	/** Id of the item whose label is being edited inline, or `null`. */
	editingId = $state<string | null>(null);

	/** Id of the item currently being dragged, or `null`. Transient builder feedback. */
	dndSourceId = $state<string | null>(null);
	/** Id of the item the drag is currently over, or `null`. */
	dndTargetId = $state<string | null>(null);
	/** Drop position for {@link dndTargetId}, or `null` when the drop is not valid. */
	dndTargetPosition = $state<DropPosition | null>(null);
	/** Id of the item whose "⋯" menu is open, or `null`. */
	menuId = $state<string | null>(null);

	/** Undo stack. Uses `$state.raw` so history snapshots are not deeply proxied. */
	#past = $state.raw<SidebarItem[][]>([]);
	/** Redo stack. */
	#future = $state.raw<SidebarItem[][]>([]);
	/** Tree snapshot taken at the start of an inline edit session. */
	#editSnapshot: SidebarItem[] | null = null;

	/** Whether {@link undo} can do anything. */
	get canUndo(): boolean {
		return this.#past.length > 0;
	}

	/** Whether {@link redo} can do anything. */
	get canRedo(): boolean {
		return this.#future.length > 0;
	}

	/** Select an item, or clear the selection with `null`. Unknown ids are ignored. */
	select(id: string | null): void {
		if (id !== null && !findItem(this.tree, id)) return;
		this.selectedId = id;
	}

	/**
	 * Enter inline-edit mode for `id`. Snapshots the tree so the whole edit can
	 * be committed as one history entry (or discarded) in {@link endEdit}.
	 */
	beginEdit(id: string): void {
		if (!findItem(this.tree, id)) return;
		this.#editSnapshot = $state.snapshot(this.tree) as SidebarItem[];
		this.selectedId = id;
		this.editingId = id;
	}

	/**
	 * Leave inline-edit mode. With `commit` (the default) the pending change
	 * becomes a single undo step; without it the tree is restored to the state
	 * captured by {@link beginEdit}.
	 */
	endEdit(commit = true): void {
		const snapshot = this.#editSnapshot;
		this.#editSnapshot = null;
		this.editingId = null;
		if (!snapshot) return;

		if (!commit) {
			this.tree = snapshot;
			this.#reconcile();
			return;
		}
		if (treeEquals(snapshot, this.tree)) return;
		this.#record(snapshot);
	}

	/** Append a new top-level item, select it and start editing its label. */
	add(label = DEFAULT_LABEL): SidebarItem {
		const item = this.#createItem(label);
		this.#commit();
		this.tree.push(item);
		this.beginEdit(item.id);
		return item;
	}

	/**
	 * Append a child to `parentId`. Returns `null` when the parent is missing,
	 * already at `MAX_DEPTH`, or on a level that forbids children.
	 */
	addChild(parentId: string, label = DEFAULT_LABEL): SidebarItem | null {
		const location = findItem(this.tree, parentId);
		if (!location) return null;
		if (!levels[location.depth - 1]?.canHaveChildren) return null;
		if (location.depth >= MAX_DEPTH) return null;

		const item = this.#createItem(label);
		this.#commit();
		location.item.children.push(item);
		location.item.collapsed = false;
		this.beginEdit(item.id);
		return item;
	}

	/**
	 * Insert a new sibling directly below `id`, at the same depth. Returns `null`
	 * when `id` is unknown.
	 */
	addSibling(id: string, label = DEFAULT_LABEL): SidebarItem | null {
		const location = findItem(this.tree, id);
		if (!location) return null;

		const item = this.#createItem(label);
		this.#commit();
		insertItem(this.tree, location.parent ? location.parent.id : null, location.index + 1, item);
		this.beginEdit(item.id);
		return item;
	}

	/** Remove `id` and its subtree. Returns the removed item, or `null`. */
	remove(id: string): SidebarItem | null {
		if (!findItem(this.tree, id)) return null;
		this.#commit();
		const removed = removeItem(this.tree, id);
		this.#reconcile();
		return removed;
	}

	/**
	 * Duplicate `id` (and its subtree, with fresh ids) directly below the
	 * original. Returns `null` when the copy would exceed `MAX_DEPTH`.
	 */
	duplicate(id: string): SidebarItem | null {
		const location = findItem(this.tree, id);
		if (!location) return null;
		if (location.depth - 1 + subtreeHeight(location.item) > MAX_DEPTH) return null;

		const copy = cloneWithNewIds(location.item);
		this.#commit();
		insertItem(this.tree, location.parent ? location.parent.id : null, location.index + 1, copy);
		this.select(copy.id);
		return copy;
	}

	/** Move `id` before/after/inside `target`. Returns `false` on an invalid move. */
	move(id: string, target: string | null, position: DropPosition): boolean {
		if (!canDrop(this.tree, id, target, position)) return false;
		this.#commit();
		return moveItem(this.tree, id, target, position);
	}

	/** Apply a shallow patch to `id`'s item. */
	update(id: string, patch: SidebarItemPatch, options: UpdateOptions = {}): boolean {
		const location = findItem(this.tree, id);
		if (!location) return false;
		if (!options.transient) this.#commit();
		Object.assign(location.item, patch);
		return true;
	}

	/** Toggle the collapsed flag of an item that has children. */
	toggleCollapse(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location || location.item.children.length === 0) return false;
		this.#commit();
		location.item.collapsed = !location.item.collapsed;
		return true;
	}

	/** Record which item is being dragged; pass `null` when the drag ends. */
	setDndSource(id: string | null): void {
		this.dndSourceId = id;
	}

	/** Record the current drop feedback; pass `null`s to clear it. */
	setDndTarget(id: string | null, position: DropPosition | null): void {
		this.dndTargetId = id;
		this.dndTargetPosition = position;
	}

	/** Clear every piece of transient drag & drop feedback. */
	clearDnd(): void {
		this.dndSourceId = null;
		this.dndTargetId = null;
		this.dndTargetPosition = null;
	}

	/** Open the "⋯" menu for `id`, or close it with `null`. */
	openMenu(id: string | null): void {
		this.menuId = id !== null && findItem(this.tree, id) ? id : null;
	}

	/** Move `id` one place up among its siblings. */
	moveUp(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location || location.index === 0) return false;
		const siblings = location.parent ? location.parent.children : this.tree;
		return this.move(id, siblings[location.index - 1].id, 'before');
	}

	/** Move `id` one place down among its siblings. */
	moveDown(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location) return false;
		const siblings = location.parent ? location.parent.children : this.tree;
		if (location.index >= siblings.length - 1) return false;
		return this.move(id, siblings[location.index + 1].id, 'after');
	}

	/** Nest `id` as the last child of its previous sibling. */
	indent(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location || location.index === 0) return false;
		const siblings = location.parent ? location.parent.children : this.tree;
		return this.move(id, siblings[location.index - 1].id, 'inside');
	}

	/** Lift `id` out to sit directly after its parent (one level shallower). */
	outdent(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location || !location.parent) return false;
		return this.move(id, location.parent.id, 'after');
	}

	/** Whether {@link moveUp} would do anything for `id`. */
	canMoveUp(id: string): boolean {
		const location = findItem(this.tree, id);
		return location !== null && location.index > 0;
	}

	/** Whether {@link moveDown} would do anything for `id`. */
	canMoveDown(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location) return false;
		const siblings = location.parent ? location.parent.children : this.tree;
		return location.index < siblings.length - 1;
	}

	/** Whether {@link indent} would be a valid move for `id`. */
	canIndent(id: string): boolean {
		const location = findItem(this.tree, id);
		if (!location || location.index === 0) return false;
		const siblings = location.parent ? location.parent.children : this.tree;
		return canDrop(this.tree, id, siblings[location.index - 1].id, 'inside');
	}

	/** Whether {@link outdent} would do anything for `id`. */
	canOutdent(id: string): boolean {
		const location = findItem(this.tree, id);
		return location !== null && location.parent !== null;
	}

	/** Restore the most recent snapshot from the undo stack. */
	undo(): boolean {
		if (this.#past.length === 0) return false;
		const previous = this.#past[this.#past.length - 1];
		this.#past = this.#past.slice(0, -1);
		this.#future = this.#future.concat($state.snapshot(this.tree) as SidebarItem[]);
		this.tree = previous;
		this.#afterHistoryNavigation();
		return true;
	}

	/** Re-apply the most recently undone snapshot. */
	redo(): boolean {
		if (this.#future.length === 0) return false;
		const next = this.#future[this.#future.length - 1];
		this.#future = this.#future.slice(0, -1);
		this.#past = this.#past.concat($state.snapshot(this.tree) as SidebarItem[]);
		this.tree = next;
		this.#afterHistoryNavigation();
		return true;
	}

	#createItem(label: string): SidebarItem {
		return { id: createId(), label, children: [] };
	}

	/** Record the current tree as an undo step and drop the redo stack. */
	#commit(): void {
		this.#record($state.snapshot(this.tree) as SidebarItem[]);
	}

	/** Push a pre-mutation snapshot onto the undo stack (capped) and clear redo. */
	#record(snapshot: SidebarItem[]): void {
		const past = this.#past.concat(snapshot);
		this.#past = past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
		this.#future = [];
	}

	/** Drop selection/editing/menu state that no longer matches the current tree. */
	#reconcile(): void {
		if (this.selectedId !== null && !findItem(this.tree, this.selectedId)) this.selectedId = null;
		if (this.editingId !== null && !findItem(this.tree, this.editingId)) this.editingId = null;
		if (this.menuId !== null && !findItem(this.tree, this.menuId)) this.menuId = null;
	}

	/** Invalidate any in-flight edit session after undo/redo. */
	#afterHistoryNavigation(): void {
		this.editingId = null;
		this.#editSnapshot = null;
		this.#reconcile();
	}
}

const STORE_CONTEXT = Symbol('sidebar-store');

/** Create a standalone store instance. */
export function createSidebarStore(): SidebarStore {
	return new SidebarStore();
}

/** Put `store` into the component context so descendants can resolve it. */
export function setSidebarStore(store: SidebarStore = createSidebarStore()): SidebarStore {
	setContext(STORE_CONTEXT, store);
	return store;
}

let singleton: SidebarStore | null = null;

/**
 * Resolve the store from context, falling back to a module-level singleton when
 * called outside a component or where no provider was set up.
 */
export function getSidebarStore(): SidebarStore {
	if (hasContext(STORE_CONTEXT)) return getContext<SidebarStore>(STORE_CONTEXT);
	singleton ??= new SidebarStore();
	return singleton;
}

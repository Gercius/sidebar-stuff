/**
 * Core data model for the sidebar builder.
 * Types only — no runtime code, no Svelte.
 */

/** A single sidebar entry. Items nest through `children`. */
export interface SidebarItem {
	/** Stable unique id. */
	id: string;
	/** Visible text. */
	label: string;
	/** Whether this item's children are collapsed. */
	collapsed?: boolean;
	/** Nested items. Always present; an empty array for leaves. */
	children: SidebarItem[];
}

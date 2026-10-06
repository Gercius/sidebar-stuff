/**
 * Core data model for the sidebar builder.
 * Types only — no runtime code, no Svelte.
 */

/** A single sidebar entry. Items nest through `children`. */
export interface SidebarItem {
	/** Stable unique id. Used for selection, drag & drop and history. */
	id: string;
	/** Visible text. */
	label: string;
	/** Optional navigation target. */
	href?: string;
	/** Optional icon. Emoji for now; a real icon set may come later. */
	icon?: string;
	/** Whether this item's children are collapsed in the preview. */
	collapsed?: boolean;
	/** Nested items. Always present; an empty array for leaves. */
	children: SidebarItem[];
}

/** Per-depth presentation and behaviour. One entry per nesting level. */
export interface LevelConfig {
	/** Left padding in px for this depth. */
	indent: number;
	/** Font size in px. */
	fontSize: number;
	/** CSS font-weight. */
	fontWeight: number;
	/** Whether items at this depth may hold children. */
	canHaveChildren: boolean;
}

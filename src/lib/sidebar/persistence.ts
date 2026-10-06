/**
 * Persistence layer: `localStorage` auto-save plus JSON export / import / copy.
 *
 * This module is deliberately framework-agnostic — it only deals with plain
 * data and the browser storage / clipboard APIs, so it has no runes. The
 * debounced `$effect` that actually drives the auto-save lives in the page
 * (see `+page.svelte`), built on {@link createDebouncedSave} and
 * {@link serializeDocument}.
 */

import { createSampleTree } from './config';
import type { SidebarStore } from './store.svelte';
import {
	DEFAULT_THEME,
	cloneTheme,
	type LevelStyle,
	type Theme,
	type ThemeStore
} from './theme.svelte';
import { cloneTree } from './tree';
import type { SidebarItem } from './types';

/** `localStorage` key holding the saved document. */
export const STORAGE_KEY = 'sidebar-builder:document';

/** Schema version of {@link SidebarDocument}; bump on breaking changes. */
export const SCHEMA_VERSION = 1;

/** Deepest tree accepted by the validator, as a guard against abusive input. */
const MAX_IMPORT_DEPTH = 50;

/** The persisted shape: the tree plus the theme, tagged with a version. */
export interface SidebarDocument {
	/** Schema version at the time of writing. */
	version: number;
	/** The sidebar tree. */
	tree: SidebarItem[];
	/** The theme. */
	theme: Theme;
}

/** Outcome of parsing untrusted JSON. */
export interface ParseResult {
	/** Whether parsing (and validation) succeeded. */
	ok: boolean;
	/** The normalized document, present only when `ok` is `true`. */
	document?: SidebarDocument;
	/** Human-readable reason when `ok` is `false`. */
	error?: string;
}

/** True for non-null, non-array objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Finite number, or the fallback when `value` is anything else. */
function numberOr(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Validate a raw item array, throwing a descriptive error on the first problem.
 * Duplicate ids are rejected because they would break keyed rendering.
 */
function normalizeItems(raw: unknown, seen: Set<string>, depth: number): SidebarItem[] {
	if (depth > MAX_IMPORT_DEPTH) throw new Error('The tree is nested too deeply.');
	if (!Array.isArray(raw)) throw new Error('The "tree" field must be an array.');
	return raw.map((entry) => normalizeItem(entry, seen, depth));
}

function normalizeItem(raw: unknown, seen: Set<string>, depth: number): SidebarItem {
	if (!isRecord(raw)) throw new Error('Every tree item must be an object.');
	if (typeof raw.id !== 'string' || raw.id === '') {
		throw new Error('Every tree item must have a non-empty string "id".');
	}
	if (typeof raw.label !== 'string') {
		throw new Error(`Tree item "${raw.id}" must have a string "label".`);
	}
	if (seen.has(raw.id)) throw new Error(`Duplicate item id "${raw.id}".`);
	seen.add(raw.id);

	const children = raw.children === undefined ? [] : normalizeItems(raw.children, seen, depth + 1);

	const item: SidebarItem = { id: raw.id, label: raw.label, children };
	if (typeof raw.href === 'string') item.href = raw.href;
	if (typeof raw.icon === 'string') item.icon = raw.icon;
	if (typeof raw.collapsed === 'boolean') item.collapsed = raw.collapsed;
	return item;
}

/** Merge untrusted per-level styles over the defaults, ignoring unknown shapes. */
function normalizeLevels(raw: unknown, base: LevelStyle[]): LevelStyle[] {
	const levels = base.map((level) => ({ ...level }));
	if (!Array.isArray(raw)) return levels;

	raw.forEach((entry, index) => {
		const target = levels[index];
		if (!target || !isRecord(entry)) return;
		target.indent = numberOr(entry.indent, target.indent);
		target.fontSize = numberOr(entry.fontSize, target.fontSize);
		target.fontWeight = numberOr(entry.fontWeight, target.fontWeight);
		if (typeof entry.color === 'string') target.color = entry.color;
	});

	return levels;
}

/** Coerce an untrusted theme over the defaults so a bad file can never crash rendering. */
function normalizeTheme(raw: unknown): Theme {
	const theme = cloneTheme(DEFAULT_THEME);
	if (!isRecord(raw)) return theme;

	if (typeof raw.background === 'string') theme.background = raw.background;
	if (typeof raw.borderColor === 'string') theme.borderColor = raw.borderColor;
	if (typeof raw.shadow === 'string') theme.shadow = raw.shadow;
	if (typeof raw.itemColor === 'string') theme.itemColor = raw.itemColor;
	if (typeof raw.itemHoverBg === 'string') theme.itemHoverBg = raw.itemHoverBg;
	if (typeof raw.itemActiveBg === 'string') theme.itemActiveBg = raw.itemActiveBg;
	if (typeof raw.fontFamily === 'string') theme.fontFamily = raw.fontFamily;

	theme.width = numberOr(raw.width, theme.width);
	theme.padding = numberOr(raw.padding, theme.padding);
	theme.borderWidth = numberOr(raw.borderWidth, theme.borderWidth);
	theme.radius = numberOr(raw.radius, theme.radius);
	theme.itemPaddingY = numberOr(raw.itemPaddingY, theme.itemPaddingY);
	theme.itemPaddingX = numberOr(raw.itemPaddingX, theme.itemPaddingX);
	theme.itemGap = numberOr(raw.itemGap, theme.itemGap);
	theme.itemRadius = numberOr(raw.itemRadius, theme.itemRadius);
	theme.fontSize = numberOr(raw.fontSize, theme.fontSize);
	theme.lineHeight = numberOr(raw.lineHeight, theme.lineHeight);

	if (typeof raw.guides === 'boolean') theme.guides = raw.guides;
	theme.levels = normalizeLevels(raw.levels, theme.levels);
	return theme;
}

/** Validate and normalize an already-parsed value into a {@link SidebarDocument}. */
export function parseDocument(value: unknown): ParseResult {
	try {
		if (!isRecord(value)) return { ok: false, error: 'Expected a JSON object.' };
		const version = typeof value.version === 'number' ? value.version : SCHEMA_VERSION;
		const tree = normalizeItems(value.tree, new Set<string>(), 0);
		const theme = normalizeTheme(value.theme);
		return { ok: true, document: { version, tree, theme } };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'The document is invalid.'
		};
	}
}

/** Parse a JSON string into a validated {@link SidebarDocument}. */
export function parseDocumentJSON(text: string): ParseResult {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return { ok: false, error: 'The file is not valid JSON.' };
	}
	return parseDocument(value);
}

/** Build a detached (deep-cloned) document from live state. */
export function createDocument(tree: SidebarItem[], theme: Theme): SidebarDocument {
	return {
		version: SCHEMA_VERSION,
		tree: JSON.parse(JSON.stringify(tree)) as SidebarItem[],
		theme: cloneTheme(theme)
	};
}

/**
 * Serialize the current state. Reading `tree`/`theme` here is what lets a
 * caller's `$effect` depend on the full document.
 */
export function serializeDocument(tree: SidebarItem[], theme: Theme, pretty = true): string {
	return JSON.stringify(createDocument(tree, theme), null, pretty ? 2 : undefined);
}

/** Write an already-serialized document. Returns `false` when storage is unavailable. */
export function saveRaw(json: string): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		localStorage.setItem(STORAGE_KEY, json);
		return true;
	} catch {
		// Private mode / quota exceeded — auto-save is best-effort.
		return false;
	}
}

/** Serialize and persist the live state immediately. */
export function saveDocument(tree: SidebarItem[], theme: Theme): boolean {
	return saveRaw(serializeDocument(tree, theme));
}

/**
 * Read the saved document. Returns `null` when nothing is stored, storage is
 * unavailable, or the payload no longer validates (callers fall back to the
 * sample tree).
 */
export function loadDocument(): SidebarDocument | null {
	if (typeof localStorage === 'undefined') return null;

	let raw: string | null;
	try {
		raw = localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
	if (!raw) return null;

	const result = parseDocumentJSON(raw);
	return result.ok && result.document ? result.document : null;
}

/** Remove the saved document. */
export function clearDocument(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}

/**
 * Create a trailing-edge debouncer for {@link saveRaw}. Returned function can be
 * called from a `$effect` on every change; only the last call within `delay` ms
 * hits storage.
 */
export function createDebouncedSave(delay = 500): (json: string) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (json: string) => {
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			saveRaw(json);
		}, delay);
	};
}

/** Trigger a browser download of the current state as a JSON file. */
export function downloadDocument(
	tree: SidebarItem[],
	theme: Theme,
	filename = 'sidebar.json'
): void {
	if (typeof document === 'undefined') return;

	const blob = new Blob([serializeDocument(tree, theme)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

/** Read and validate a user-selected JSON file. */
export async function readDocumentFile(file: File): Promise<ParseResult> {
	try {
		return parseDocumentJSON(await file.text());
	} catch {
		return { ok: false, error: 'The file could not be read.' };
	}
}

/** Copy the serialized document to the clipboard. Returns `false` on failure. */
export async function copyDocumentToClipboard(tree: SidebarItem[], theme: Theme): Promise<boolean> {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
	try {
		await navigator.clipboard.writeText(serializeDocument(tree, theme));
		return true;
	} catch {
		return false;
	}
}

/**
 * Replace the live tree and theme with a loaded/imported document. Selections
 * and the active-item demo are cleared so they cannot point at stale ids.
 */
export function applyDocument(
	store: SidebarStore,
	theme: ThemeStore,
	document: SidebarDocument,
	options: { recordHistory?: boolean } = {}
): void {
	if (options.recordHistory !== false) store.recordExternalChange();
	store.tree = cloneTree(document.tree);
	store.select(null);
	theme.current = document.theme;
	theme.setActiveItem(null);
}

/** Restore the built-in default document: the sample tree plus the default theme. */
export function resetDocument(store: SidebarStore, theme: ThemeStore): void {
	store.recordExternalChange();
	store.tree = createSampleTree();
	store.select(null);
	theme.current = cloneTheme(DEFAULT_THEME);
	theme.setActiveItem(null);
}

/**
 * Sidebar theme: the customizable look of the sidebar, modelled as a small set
 * of values that map 1:1 onto the `--sb-*` CSS variables consumed by
 * {@link Sidebar} and {@link SidebarItem}.
 *
 * The store is a singleton (with a context override) mirroring
 * `store.svelte.ts`, so any component can read the live theme without prop
 * drilling. Presentation that used to be read directly from `config.levels`
 * (indent, font size, weight, colour) is now provided per level here, which is
 * how the theme panel "feeds `levels`".
 */

import { getContext, hasContext, setContext } from 'svelte';
import { levels as baseLevels } from './config';

/** Base font size (px) that per-level sizes are expressed against. */
const BASE_FONT_SIZE = 14;

/** Per-level presentation overrides. `color: ''` means "inherit the item colour". */
export interface LevelStyle {
	/** Left padding in px for this depth. */
	indent: number;
	/** Font size in px at the base font size. */
	fontSize: number;
	/** CSS font-weight. */
	fontWeight: number;
	/** Per-level text colour, or `''` to inherit `itemColor`. */
	color: string;
}

/**
 * The full theme. Every field drives one `--sb-*` CSS variable (see
 * {@link ThemeStore.vars}); the four numeric/colour fields that need composing
 * (`borderWidth` + `borderColor`, `itemPaddingY` + `itemPaddingX`) feed a single
 * shorthand variable.
 */
export interface Theme {
	/** Sidebar width in px. */
	width: number;
	/** Sidebar background colour. */
	background: string;
	/** Container padding in px. */
	padding: number;
	/** Border width in px. `0` removes the border. */
	borderWidth: number;
	/** Border colour (also used for the nested-line guides). */
	borderColor: string;
	/** Corner radius in px. */
	radius: number;
	/** `box-shadow` value. */
	shadow: string;
	/** Item text colour. */
	itemColor: string;
	/** Item background on hover. */
	itemHoverBg: string;
	/** Item background for the active item. */
	itemActiveBg: string;
	/** Item vertical padding in px. */
	itemPaddingY: number;
	/** Item horizontal padding in px. */
	itemPaddingX: number;
	/** Gap between items in px. */
	itemGap: number;
	/** Item corner radius in px. */
	itemRadius: number;
	/** CSS `font-family` for the sidebar. */
	fontFamily: string;
	/** Base font size in px; per-level sizes scale with it. */
	fontSize: number;
	/** CSS `line-height`. */
	lineHeight: number;
	/** Per-level presentation overrides, one entry per nesting level. */
	levels: LevelStyle[];
	/** Whether nested-line guides are drawn next to child lists. */
	guides: boolean;
}

/** A named, ready-to-apply theme. */
export interface ThemePreset {
	/** Stable id used by the preset buttons. */
	id: string;
	/** Human-readable name. */
	name: string;
	/** The theme values. */
	theme: Theme;
}

/** A `font-family` option for the typography select. */
export interface FontOption {
	label: string;
	value: string;
}

/** A `box-shadow` option for the shadow select. */
export interface ShadowOption {
	label: string;
	value: string;
}

/** Font families offered by the panel. Values are valid CSS `font-family` lists. */
export const FONT_OPTIONS: FontOption[] = [
	{ label: 'System UI', value: 'inherit' },
	{ label: 'Inter', value: 'Inter, system-ui, sans-serif' },
	{ label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
	{ label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
	{ label: 'Rounded', value: "ui-rounded, 'Segoe UI', system-ui, sans-serif" }
];

/** Shadow presets offered by the panel. */
export const SHADOW_OPTIONS: ShadowOption[] = [
	{ label: 'None', value: 'none' },
	{ label: 'Subtle', value: '0 1px 3px rgb(0 0 0 / 0.08)' },
	{ label: 'Medium', value: '0 4px 12px rgb(0 0 0 / 0.14)' },
	{ label: 'Strong', value: '0 10px 28px rgb(0 0 0 / 0.22)' }
];

/** Fresh per-level styles seeded from {@link baseLevels}. */
function defaultLevelStyles(): LevelStyle[] {
	return baseLevels.map((level) => ({
		indent: level.indent,
		fontSize: level.fontSize,
		fontWeight: level.fontWeight,
		color: ''
	}));
}

/** The built-in light theme; also the reset target. */
export const DEFAULT_THEME: Theme = {
	width: 260,
	background: '#ffffff',
	padding: 8,
	borderWidth: 1,
	borderColor: '#d7dce3',
	radius: 8,
	shadow: '0 1px 3px rgb(0 0 0 / 0.08)',
	itemColor: '#1f2530',
	itemHoverBg: '#f1f3f7',
	itemActiveBg: '#e4ecfd',
	itemPaddingY: 6,
	itemPaddingX: 8,
	itemGap: 2,
	itemRadius: 6,
	fontFamily: 'inherit',
	fontSize: BASE_FONT_SIZE,
	lineHeight: 1.35,
	levels: defaultLevelStyles(),
	guides: false
};

/** Built-in presets: light, dark, minimal, Notion-like and VS Code-like. */
export const THEME_PRESETS: ThemePreset[] = [
	{
		id: 'light',
		name: 'Light',
		theme: DEFAULT_THEME
	},
	{
		id: 'dark',
		name: 'Dark',
		theme: {
			...DEFAULT_THEME,
			background: '#1e222a',
			borderColor: '#333a45',
			shadow: '0 1px 3px rgb(0 0 0 / 0.4)',
			itemColor: '#d7dce3',
			itemHoverBg: '#2a2f3a',
			itemActiveBg: '#34405c'
		}
	},
	{
		id: 'minimal',
		name: 'Minimal',
		theme: {
			...DEFAULT_THEME,
			borderWidth: 0,
			radius: 0,
			shadow: 'none',
			itemColor: '#333333',
			itemHoverBg: '#f6f7f8',
			itemActiveBg: '#ececec',
			itemPaddingY: 8,
			itemPaddingX: 10,
			itemGap: 0,
			itemRadius: 0
		}
	},
	{
		id: 'notion',
		name: 'Notion-like',
		theme: {
			...DEFAULT_THEME,
			borderColor: '#e9e9e7',
			radius: 4,
			shadow: 'none',
			itemColor: '#37352f',
			itemHoverBg: '#f1f1ef',
			itemActiveBg: '#e8e8e5',
			itemPaddingY: 5,
			itemGap: 1,
			itemRadius: 3,
			lineHeight: 1.5,
			guides: true
		}
	},
	{
		id: 'vscode',
		name: 'VS Code-like',
		theme: {
			...DEFAULT_THEME,
			background: '#1e1e1e',
			borderColor: '#2b2b2b',
			radius: 0,
			shadow: 'none',
			itemColor: '#cccccc',
			itemHoverBg: '#2a2d2e',
			itemActiveBg: '#37373d',
			itemPaddingY: 4,
			itemPaddingX: 6,
			itemGap: 0,
			itemRadius: 0,
			fontSize: 13,
			lineHeight: 1.3,
			guides: true
		}
	}
];

/** Deep-clone a theme so presets and defaults never share mutable state. */
export function cloneTheme(theme: Theme): Theme {
	return { ...theme, levels: theme.levels.map((level) => ({ ...level })) };
}

/** Mutable theme state plus the derived CSS-variable map. */
export class ThemeStore {
	/** The live theme. Mutated in place by the setters below. */
	current = $state<Theme>(cloneTheme(DEFAULT_THEME));
	/**
	 * Id of the item previewed in the "active" state, or `null`. Builder-only
	 * demo state; it never changes the tree.
	 */
	activeItemId = $state<string | null>(null);

	/** The available presets. */
	get presets(): ThemePreset[] {
		return THEME_PRESETS;
	}

	/**
	 * The theme as `--sb-*` CSS variables, including one set per nesting level
	 * and the guide colour toggle.
	 */
	get vars(): Record<string, string> {
		const theme = this.current;
		const vars: Record<string, string> = {
			'--sb-width': `${theme.width}px`,
			'--sb-bg': theme.background,
			'--sb-padding': `${theme.padding}px`,
			'--sb-border':
				theme.borderWidth > 0 ? `${theme.borderWidth}px solid ${theme.borderColor}` : 'none',
			'--sb-radius': `${theme.radius}px`,
			'--sb-shadow': theme.shadow,
			'--sb-item-color': theme.itemColor,
			'--sb-item-hover-bg': theme.itemHoverBg,
			'--sb-item-active-bg': theme.itemActiveBg,
			'--sb-item-padding': `${theme.itemPaddingY}px ${theme.itemPaddingX}px`,
			'--sb-item-gap': `${theme.itemGap}px`,
			'--sb-item-radius': `${theme.itemRadius}px`,
			'--sb-font-family': theme.fontFamily,
			'--sb-font-size': `${theme.fontSize}px`,
			'--sb-font-scale': `${theme.fontSize / BASE_FONT_SIZE}`,
			'--sb-line-height': `${theme.lineHeight}`,
			'--sb-guide-color': theme.guides ? theme.borderColor : 'transparent'
		};

		theme.levels.forEach((level, index) => {
			vars[`--sb-level-${index}-indent`] = `${level.indent}px`;
			vars[`--sb-level-${index}-font-size`] = `calc(${level.fontSize}px * var(--sb-font-scale, 1))`;
			vars[`--sb-level-${index}-font-weight`] = `${level.fontWeight}`;
			vars[`--sb-level-${index}-color`] = level.color || theme.itemColor;
		});

		return vars;
	}

	/** Shallow-merge a patch into the current theme. */
	update(patch: Partial<Theme>): void {
		Object.assign(this.current, patch);
	}

	/** Merge a patch into one level's style. Unknown indexes are ignored. */
	updateLevel(index: number, patch: Partial<LevelStyle>): void {
		const level = this.current.levels[index];
		if (!level) return;
		Object.assign(level, patch);
	}

	/** Replace the theme with a preset (a deep copy). */
	applyPreset(id: string): boolean {
		const preset = THEME_PRESETS.find((candidate) => candidate.id === id);
		if (!preset) return false;
		this.current = cloneTheme(preset.theme);
		return true;
	}

	/** Restore the built-in default theme. */
	reset(): void {
		this.current = cloneTheme(DEFAULT_THEME);
	}

	/** Mark `id` as the active-state demo item, or clear it with `null`. */
	setActiveItem(id: string | null): void {
		this.activeItemId = id;
	}
}

const THEME_CONTEXT = Symbol('sidebar-theme');

/** Create a standalone theme store instance. */
export function createThemeStore(): ThemeStore {
	return new ThemeStore();
}

/** Put `store` into the component context so descendants can resolve it. */
export function setThemeStore(store: ThemeStore = createThemeStore()): ThemeStore {
	setContext(THEME_CONTEXT, store);
	return store;
}

/**
 * Resolve the theme store from context, falling back to a module-level
 * singleton when called outside a component or where no provider was set up.
 */
export function getThemeStore(): ThemeStore {
	if (hasContext(THEME_CONTEXT)) return getContext<ThemeStore>(THEME_CONTEXT);
	singleton ??= new ThemeStore();
	return singleton;
}

let singleton: ThemeStore | null = null;

<script lang="ts">
	/**
	 * Sidebar container. Renders the tree (from the store by default) and exposes
	 * the customizable look through `--sb-*` CSS variables. Defaults live here so
	 * the component works standalone; the theme panel (task 7) overrides them via
	 * the `vars` prop.
	 */

	import { levels as configLevels } from './config';
	import { dndMonitor } from './dnd';
	import { getSidebarStore } from './store.svelte';
	import type { SidebarItem as Item } from './types';
	import SidebarItem from './SidebarItem.svelte';

	interface Props {
		/** Tree to render. Defaults to the store's tree. */
		items?: Item[];
		/** CSS custom property overrides applied on top of the defaults. */
		vars?: Record<string, string>;
		/** Invoked when an item's "⋯" affordance is activated. */
		onMenu?: (item: Item) => void;
	}

	let { items, vars = {}, onMenu }: Props = $props();

	const store = getSidebarStore();

	/** The rendered tree, defaulting to the live store tree. */
	const tree = $derived(items ?? store.tree);

	/** Default values for the customizable theme variables (1:1 with CSS vars). */
	const defaultVars: Record<string, string> = {
		'--sb-width': '260px',
		'--sb-bg': '#ffffff',
		'--sb-padding': '8px',
		'--sb-border': '1px solid #d7dce3',
		'--sb-radius': '8px',
		'--sb-shadow': '0 1px 3px rgb(0 0 0 / 0.08)',
		'--sb-item-color': '#1f2530',
		'--sb-item-hover-bg': '#f1f3f7',
		'--sb-item-active-bg': '#e4ecfd',
		'--sb-item-padding': '6px 8px',
		'--sb-item-gap': '2px',
		'--sb-item-radius': '6px',
		'--sb-font-family': 'inherit',
		'--sb-font-size': '14px',
		'--sb-font-scale': '1',
		'--sb-line-height': '1.35',
		'--sb-guide-color': 'transparent'
	};

	// Seed per-level defaults from the static config so the component still works
	// standalone; the theme panel overrides them through the `vars` prop.
	configLevels.forEach((level, index) => {
		defaultVars[`--sb-level-${index}-indent`] = `${level.indent}px`;
		defaultVars[`--sb-level-${index}-font-size`] = `${level.fontSize}px`;
		defaultVars[`--sb-level-${index}-font-weight`] = `${level.fontWeight}`;
		defaultVars[`--sb-level-${index}-color`] = defaultVars['--sb-item-color'];
	});

	const theme = $derived({ ...defaultVars, ...vars });

	/** All variables collapsed into one inline `style` string. */
	const style = $derived(
		Object.entries(theme)
			.map(([property, value]) => `${property}: ${value}`)
			.join('; ')
	);
</script>

<nav class="sidebar" aria-label="Sidebar preview" {style} {@attach dndMonitor()}>
	<ul class="tree">
		{#each tree as item (item.id)}
			<SidebarItem {item} depth={0} {onMenu} />
		{/each}
	</ul>
</nav>

<style>
	.sidebar {
		width: var(--sb-width);
		background: var(--sb-bg);
		padding: var(--sb-padding);
		border: var(--sb-border);
		border-radius: var(--sb-radius);
		box-shadow: var(--sb-shadow);
		font-family: var(--sb-font-family);
		font-size: var(--sb-font-size);
		line-height: var(--sb-line-height);
		color: var(--sb-item-color);
	}

	.tree {
		display: flex;
		flex-direction: column;
		gap: var(--sb-item-gap);
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>

<script lang="ts">
	/**
	 * Theme panel: edits the global sidebar look plus per-level overrides.
	 *
	 * Controls use native inputs only — `type="color"`, `type="range"` with a
	 * number readout, and `select`s for fonts and shadows. Every control writes
	 * through {@link ThemeStore}, whose `vars` getter turns the theme into the
	 * `--sb-*` CSS variables consumed by the sidebar.
	 */

	import { getSidebarStore } from '../sidebar/store.svelte';
	import {
		FONT_OPTIONS,
		SHADOW_OPTIONS,
		THEME_PRESETS,
		getThemeStore,
		type Theme
	} from '../sidebar/theme.svelte';
	import type { SidebarItem } from '../sidebar/types';

	const store = getSidebarStore();
	const theme = getThemeStore();

	interface FlatItem {
		id: string;
		label: string;
		depth: number;
	}

	/** Depth-first list of items, used by the active-item select. */
	function flatten(items: SidebarItem[], depth = 0): FlatItem[] {
		return items.flatMap((item) => [
			{ id: item.id, label: item.label, depth },
			...flatten(item.children, depth + 1)
		]);
	}

	const flatItems = $derived(flatten(store.tree));

	/** Structural comparison, used to highlight the active preset. */
	function sameTheme(a: Theme, b: Theme): boolean {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	const activePreset = $derived(
		THEME_PRESETS.find((preset) => sameTheme(preset.theme, theme.current))?.id ?? null
	);

	/** Preset shadows, plus a "Custom" entry when the theme uses an unlisted one. */
	const shadowOptions = $derived.by(() => {
		const options = SHADOW_OPTIONS.map((option) => ({ ...option }));
		if (!options.some((option) => option.value === theme.current.shadow)) {
			options.push({ label: 'Custom', value: theme.current.shadow });
		}
		return options;
	});

	/** Indentation is scale-dependent, so cap it to a sensible pixel range. */
	const MAX_INDENT = 80;
</script>

<aside class="theme-panel">
	<h2>Presets</h2>
	<div class="presets">
		{#each THEME_PRESETS as preset (preset.id)}
			<button
				type="button"
				class:active={activePreset === preset.id}
				onclick={() => theme.applyPreset(preset.id)}
			>
				{preset.name}
			</button>
		{/each}
	</div>
	<button type="button" class="reset" onclick={() => theme.reset()}>Reset to default</button>

	<h2>Preview</h2>
	<label class="field">
		<span class="field-head"><span>Active item</span></span>
		<select
			value={theme.activeItemId ?? ''}
			onchange={(event) => theme.setActiveItem(event.currentTarget.value || null)}
		>
			<option value="">None</option>
			{#each flatItems as entry (entry.id)}
				<option value={entry.id}>{'\u00A0\u00A0'.repeat(entry.depth) + entry.label}</option>
			{/each}
		</select>
	</label>

	<h2>Sidebar</h2>
	<label class="field">
		<span class="field-head"
			><span>Width</span><span class="value">{theme.current.width}px</span></span
		>
		<input type="range" min="180" max="420" step="1" bind:value={theme.current.width} />
	</label>
	<label class="field">
		<span class="field-head"><span>Background</span></span>
		<input type="color" bind:value={theme.current.background} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Padding</span><span class="value">{theme.current.padding}px</span></span
		>
		<input type="range" min="0" max="24" step="1" bind:value={theme.current.padding} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Border width</span><span class="value">{theme.current.borderWidth}px</span></span
		>
		<input type="range" min="0" max="4" step="1" bind:value={theme.current.borderWidth} />
	</label>
	<label class="field">
		<span class="field-head"><span>Border colour</span></span>
		<input type="color" bind:value={theme.current.borderColor} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Corner radius</span><span class="value">{theme.current.radius}px</span></span
		>
		<input type="range" min="0" max="24" step="1" bind:value={theme.current.radius} />
	</label>
	<label class="field">
		<span class="field-head"><span>Shadow</span></span>
		<select bind:value={theme.current.shadow}>
			{#each shadowOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>

	<h2>Items</h2>
	<label class="field">
		<span class="field-head"><span>Text colour</span></span>
		<input type="color" bind:value={theme.current.itemColor} />
	</label>
	<label class="field">
		<span class="field-head"><span>Hover background</span></span>
		<input type="color" bind:value={theme.current.itemHoverBg} />
	</label>
	<label class="field">
		<span class="field-head"><span>Active background</span></span>
		<input type="color" bind:value={theme.current.itemActiveBg} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Vertical padding</span><span class="value">{theme.current.itemPaddingY}px</span></span
		>
		<input type="range" min="0" max="16" step="1" bind:value={theme.current.itemPaddingY} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Horizontal padding</span><span class="value">{theme.current.itemPaddingX}px</span
			></span
		>
		<input type="range" min="0" max="24" step="1" bind:value={theme.current.itemPaddingX} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Item gap</span><span class="value">{theme.current.itemGap}px</span></span
		>
		<input type="range" min="0" max="12" step="1" bind:value={theme.current.itemGap} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Item radius</span><span class="value">{theme.current.itemRadius}px</span></span
		>
		<input type="range" min="0" max="16" step="1" bind:value={theme.current.itemRadius} />
	</label>

	<h2>Typography</h2>
	<label class="field">
		<span class="field-head"><span>Font family</span></span>
		<select bind:value={theme.current.fontFamily}>
			{#each FONT_OPTIONS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="field">
		<span class="field-head"
			><span>Base size</span><span class="value">{theme.current.fontSize}px</span></span
		>
		<input type="range" min="11" max="20" step="1" bind:value={theme.current.fontSize} />
	</label>
	<label class="field">
		<span class="field-head"
			><span>Line height</span><span class="value">{theme.current.lineHeight}</span></span
		>
		<input type="range" min="1" max="2" step="0.05" bind:value={theme.current.lineHeight} />
	</label>

	<h2>Levels</h2>
	<label class="field checkbox">
		<input type="checkbox" bind:checked={theme.current.guides} />
		<span>Nested-line guides</span>
	</label>

	{#each theme.current.levels as level, index (index)}
		<fieldset class="level">
			<legend>Depth {index + 1}</legend>
			<label class="field">
				<span class="field-head"
					><span>Indent</span><span class="value">{level.indent}px</span></span
				>
				<input
					type="range"
					min="0"
					max={MAX_INDENT}
					step="1"
					value={level.indent}
					oninput={(event) => theme.updateLevel(index, { indent: +event.currentTarget.value })}
				/>
			</label>
			<label class="field">
				<span class="field-head"
					><span>Font size</span><span class="value">{level.fontSize}px</span></span
				>
				<input
					type="range"
					min="10"
					max="20"
					step="1"
					value={level.fontSize}
					oninput={(event) => theme.updateLevel(index, { fontSize: +event.currentTarget.value })}
				/>
			</label>
			<label class="field">
				<span class="field-head"
					><span>Weight</span><span class="value">{level.fontWeight}</span></span
				>
				<input
					type="range"
					min="300"
					max="800"
					step="100"
					value={level.fontWeight}
					oninput={(event) => theme.updateLevel(index, { fontWeight: +event.currentTarget.value })}
				/>
			</label>
			<div class="field">
				<span class="field-head"><span>Text colour</span></span>
				<div class="color-row">
					<input
						type="color"
						value={level.color || theme.current.itemColor}
						oninput={(event) => theme.updateLevel(index, { color: event.currentTarget.value })}
					/>
					<button
						type="button"
						class="inherit"
						class:on={level.color === ''}
						onclick={() => theme.updateLevel(index, { color: '' })}
						title="Inherit the item colour"
					>
						Inherit
					</button>
				</div>
			</div>
		</fieldset>
	{/each}
</aside>

<style>
	.theme-panel {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border-left: 1px solid var(--ui-border);
		background: var(--ui-panel-bg);
		overflow-y: auto;
	}

	h2 {
		margin: 8px 0 0;
		color: var(--ui-text-muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.presets {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.presets button,
	.reset {
		padding: 6px 8px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		color: var(--ui-text);
		cursor: pointer;
	}

	.presets button:hover,
	.reset:hover {
		border-color: var(--ui-accent);
	}

	.presets button.active {
		border-color: var(--ui-accent);
		background: var(--ui-accent);
		color: #fff;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: var(--ui-text-muted);
	}

	.field-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.value {
		color: var(--ui-text);
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		margin: 0;
	}

	input[type='color'] {
		width: 100%;
		height: 26px;
		padding: 0;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		cursor: pointer;
	}

	select {
		padding: 5px 7px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		color: var(--ui-text);
	}

	.field.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 6px;
		color: var(--ui-text);
	}

	.level {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 8px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
	}

	.level legend {
		padding: 0 4px;
		color: var(--ui-text-muted);
		font-size: 11px;
		font-weight: 600;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.color-row input[type='color'] {
		flex: 1;
	}

	.inherit {
		flex: 0 0 auto;
		padding: 4px 8px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-radius);
		background: #fff;
		color: var(--ui-text-muted);
		font-size: 11px;
		cursor: pointer;
	}

	.inherit.on {
		border-color: var(--ui-accent);
		color: var(--ui-accent);
	}
</style>

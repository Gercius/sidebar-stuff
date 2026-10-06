<script lang="ts">
	import { dndMonitor } from './dnd';
	import { store } from './store.svelte';
	import SidebarItem from './SidebarItem.svelte';
</script>

<nav class="sidebar" aria-label="Sidebar" {@attach dndMonitor()}>
	<ul class="tree">
		{#each store.tree as item (item.id)}
			<SidebarItem {item} depth={0} />
		{/each}
	</ul>

	<button class="add-item" type="button" onclick={() => store.add(null)}> + Add item </button>
</nav>

<style>
	.sidebar {
		box-sizing: border-box;
		width: 260px;
		padding: 8px;
		border: 1px solid #d7dce3;
		border-radius: 6px;
		background: #fff;
		color: #1f2530;
		font-family: inherit;
		font-size: 14px;
		line-height: 1.35;
	}

	.tree {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.add-item {
		width: 100%;
		margin-top: 8px;
		padding: 6px 8px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.add-item:hover {
		background: #f1f3f7;
	}
</style>

import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The builder is fully client-side, so the whole app is prerendered to static files.
			// See https://svelte.dev/docs/kit/adapter-static for more information about the adapter.
			adapter: adapter()
		})
	]
});

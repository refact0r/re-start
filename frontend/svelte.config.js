import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    preprocess: vitePreprocess(),
    vitePlugin: {
        inspector: {
            toggleKeyCombo: 'alt-x',
            showToggleButton: 'active',
            toggleButtonPos: 'bottom-right',
            holdMode: true,
        },
    },
}

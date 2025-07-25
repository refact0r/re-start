import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

// Read version from manifest.json at build time
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [svelte()],
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
    },
})

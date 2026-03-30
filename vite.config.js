import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'
import { simpleIconsVirtualModules } from './plugins/simple-icons-virtual-modules.js'
import { injectThemeScript } from './plugins/inject-theme-script.js'
import { buildManifest } from './plugins/build-manifest.js'
import { zipChromeOutput } from './plugins/zip-chrome-output.js'

// Read version from manifest.json at build time
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        simpleIconsVirtualModules(),
        svelte(),
        injectThemeScript(),
        buildManifest(),
        zipChromeOutput(manifest.version),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
    },
})

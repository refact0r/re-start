import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteInspector } from '@sveltejs/vite-plugin-svelte-inspector'
import fs from 'fs'

interface Manifest {
    version: string
    [key: string]: unknown
}

// Read version from manifest.json at build time
const manifest: Manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf-8'))

// Plugin to inject theme data into HTML
function injectThemeScript(): Plugin {
    return {
        name: 'inject-theme-script',
        transformIndexHtml(html: string): string {
            // Try .ts first, fall back to .js
            const themesPath = fs.existsSync('./src/lib/themes.ts')
                ? './src/lib/themes.ts'
                : './src/lib/themes.js'
            const themesModule = fs.readFileSync(themesPath, 'utf-8')

            const themesMatch = themesModule.match(
                /export const themes(?::\s*\w+)?\s*=\s*({[\s\S]*?^})/m
            )
            const defaultThemeMatch = themesModule.match(
                /export const defaultTheme(?::\s*\w+)?\s*=\s*['"](.+?)['"]/
            )

            if (!themesMatch?.[1] || !defaultThemeMatch?.[1]) {
                console.error('Failed to extract theme data')
                return html
            }

            return html
                .replace('__THEMES_DATA__', themesMatch[1])
                .replace('__DEFAULT_THEME__', defaultThemeMatch[1])
        },
    }
}

// Plugin to exclude manifest.json from public copy (we'll generate it separately)
function excludeManifest(): Plugin {
    return {
        name: 'exclude-manifest',
        generateBundle(_options, bundle) {
            // Remove manifest.json from bundle if Vite copied it
            delete bundle['manifest.json']
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        svelte({
            compilerOptions: {
                dev: true,
            },
        }),
        svelteInspector(),
        injectThemeScript(),
        excludeManifest(),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
    },
    server: {
        port: 5999,
        proxy: {
            '/api': {
                target: 'http://localhost:3004',
                changeOrigin: true,
            },
        },
    },
})

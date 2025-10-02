import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

// Read version from manifest.json at build time
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf-8'))

// Plugin to inject theme data into HTML
function injectThemeScript() {
    return {
        name: 'inject-theme-script',
        transformIndexHtml(html) {
            const themesModule = fs.readFileSync('./src/lib/themes.js', 'utf-8')

            const themesMatch = themesModule.match(
                /export const themes = ({[\s\S]*?})\s*export const themeNames/
            )
            const defaultThemeMatch = themesModule.match(
                /export const defaultTheme = ['"](.+?)['"]/
            )

            if (!themesMatch || !defaultThemeMatch) {
                console.error('Failed to extract theme data')
                return html
            }

            return html
                .replace('__THEMES_DATA__', themesMatch[1])
                .replace('__DEFAULT_THEME__', defaultThemeMatch[1])
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [svelte(), injectThemeScript()],
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
    },
})

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

// Read version from manifest.json at build time
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf-8'))

// Plugin to inline theme CSS into the HTML head
function injectThemeCSS() {
    return {
        name: 'inject-theme-css',
        transformIndexHtml(html) {
            // Read theme CSS file
            const themesCSS = fs.readFileSync('./src/lib/config/themes.css', 'utf-8')

            // Create inline styles with all themes
            const styleTag = `<style>${themesCSS}</style>`

            // Inject styles before closing head tag
            return html.replace('</head>', `${styleTag}\n</head>`)
        },
    }
}

// Plugin to exclude manifest.json from public copy (we'll generate it separately)
function excludeManifest() {
    return {
        name: 'exclude-manifest',
        generateBundle(options, bundle) {
            // Remove manifest.json from bundle if Vite copied it
            delete bundle['manifest.json']
        },
    }
}

// Plugin to run build-manifest.js after each build (including in watch mode)
function buildManifest() {
    let outDir = 'dist/firefox'

    return {
        name: 'build-manifest',
        configResolved(config) {
            // Get the output directory from Vite config
            outDir = config.build.outDir
        },
        closeBundle() {
            // Detect browser from output directory
            const browser = outDir.includes('chrome') ? 'chrome' : 'firefox'

            try {
                execSync(`node scripts/build-manifest.js ${browser} ${outDir}`, {
                    stdio: 'inherit'
                })
            } catch (error) {
                console.error('Failed to build manifest:', error.message)
            }
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [svelte(), injectThemeCSS(), excludeManifest(), buildManifest()],
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
    },
})

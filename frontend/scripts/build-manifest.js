import fs from 'fs'
import path from 'path'

const browser = process.argv[2] || 'firefox'
const distPath = process.argv[3] || './dist'
const manifestPath = './public/manifest.json'

// Read the source manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

// Browser-specific modifications
if (browser === 'chrome') {
    // Remove chrome_settings_overrides for Chrome due to search_provider bug
    delete manifest.chrome_settings_overrides
    // Remove Firefox-specific settings
    delete manifest.browser_specific_settings
} else if (browser === 'firefox') {
    // Firefox manifest is already complete in the source
    // No modifications needed
}

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true })
}

// Write the browser-specific manifest
fs.writeFileSync(
    path.join(distPath, 'manifest.json'),
    JSON.stringify(manifest, null, 4)
)

console.log(`✓ Built manifest.json for ${browser}`)

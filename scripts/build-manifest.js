import fs from 'fs'
import path from 'path'

const browser = process.argv[2] || 'firefox'
const distPath = process.argv[3] || './dist'
const manifestPath = './public/manifest.json'

// OAuth2 client IDs
const CLIENT_IDS = {
    dev: '992839123761-e8l791fd5kemrnticmkn93s4uidtl69i.apps.googleusercontent.com',
    prod: '489393578728-s8v9trudldppumhduidbko2v82i79hv5.apps.googleusercontent.com'
}

// Read the source manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

// Browser-specific modifications
if (browser === 'chrome') {
    // Remove chrome_settings_overrides for Chrome due to search_provider bug
    delete manifest.chrome_settings_overrides
    // Remove Firefox-specific settings
    delete manifest.browser_specific_settings
    // Keep oauth2 for Chrome

    // Replace client_id based on CLIENT_ENV environment variable
    const clientEnv = process.env.CLIENT_ENV
    if (clientEnv === 'dev' || clientEnv === 'prod') {
        if (manifest.oauth2) {
            manifest.oauth2.client_id = CLIENT_IDS[clientEnv]
        }
    }
} else if (browser === 'firefox') {
    // Remove Chrome-specific oauth2 configuration
    delete manifest.oauth2
    // Remove identity permission - Firefox doesn't support chrome.identity.getAuthToken
    if (manifest.permissions) {
        manifest.permissions = manifest.permissions.filter(p => p !== 'identity')
    }
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

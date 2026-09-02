import fs from 'fs'
import path from 'path'

const CLIENT_IDS = {
    dev: '489393578728-r6p53q4oe7ngcm6r4kmtgbk17s2cgpk8.apps.googleusercontent.com',
    prod: '489393578728-s8v9trudldppumhduidbko2v82i79hv5.apps.googleusercontent.com',
}

export function buildManifest() {
    let outDir = 'dist/firefox'

    return {
        name: 'manifest-plugin',
        configResolved(config) {
            outDir = config.build.outDir
        },
        generateBundle(options, bundle) {
            delete bundle['manifest.json']
        },
        closeBundle() {
            const browser = outDir.includes('chrome') ? 'chrome' : 'firefox'
            const manifest = JSON.parse(
                fs.readFileSync('./public/manifest.json', 'utf-8')
            )

            if (browser === 'chrome') {
                delete manifest.chrome_settings_overrides
                delete manifest.browser_specific_settings
                const clientEnv = process.env.CLIENT_ENV
                if (
                    (clientEnv === 'dev' || clientEnv === 'prod') &&
                    manifest.oauth2
                ) {
                    manifest.oauth2.client_id = CLIENT_IDS[clientEnv]
                }
            } else if (browser === 'firefox') {
                delete manifest.oauth2
                if (manifest.permissions) {
                    manifest.permissions = manifest.permissions.filter(
                        (p) => p !== 'identity'
                    )
                }
                if (manifest.host_permissions) {
                    manifest.host_permissions = manifest.host_permissions.filter(
                        (host) =>
                            host !== 'https://graph.microsoft.com/*' &&
                            host !==
                                'https://login.microsoftonline.com/*'
                    )
                    if (manifest.host_permissions.length === 0) {
                        delete manifest.host_permissions
                    }
                }
            }

            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true })
            }

            fs.writeFileSync(
                path.join(outDir, 'manifest.json'),
                JSON.stringify(manifest, null, 4)
            )

            console.log(`✓ Built manifest.json for ${browser}`)
        },
    }
}

import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

export function zipChromeOutput(version) {
    let outDir
    return {
        name: 'zip-chrome-output',
        configResolved(config) {
            outDir = config.build.outDir
        },
        closeBundle() {
            if (!outDir?.endsWith('chrome')) return
            const absOut = path.resolve(outDir)
            const zipName = `re-start-chrome-v${version}.zip`
            const zipPath = path.join(absOut, zipName)
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
            execSync(`zip -r "${zipPath}" .`, { cwd: absOut })
            console.log(`\nzipped Chrome build → dist/${zipName}`)
        },
    }
}

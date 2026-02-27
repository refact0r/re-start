#!/usr/bin/env node
// Generates src/lib/styles/simple-icons.css and src/lib/utils/simple-icons-slugs.js
// from the simple-icons-font package data.
//
// Usage: node scripts/generate-simple-icons.js

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const icons = JSON.parse(
    readFileSync(join(root, 'node_modules/simple-icons-font/font/simple-icons.json'), 'utf-8'),
)

// --- Generate CSS ---

const cssLines = [
    `/* Auto-generated from simple-icons-font — do not edit */`,
    `@font-face {`,
    `    font-family: 'Simple Icons';`,
    `    src: url('simple-icons-font/font/SimpleIcons.woff2') format('woff2');`,
    `    font-display: block;`,
    `}`,
    ``,
    `.si {`,
    `    font-style: normal;`,
    `    font-family: 'Simple Icons', sans-serif;`,
    `    vertical-align: middle;`,
    `}`,
]

for (const icon of icons) {
    cssLines.push(``, `.si-${icon.slug}::before {`, `    content: '\\${icon.code}';`, `}`)
}

const cssPath = join(root, 'src/lib/styles/simple-icons.css')
mkdirSync(dirname(cssPath), { recursive: true })
writeFileSync(cssPath, cssLines.join('\n') + '\n')

// --- Generate slugs JS ---

const slugs = icons.map((i) => i.slug).sort()
const jsLines = [
    `// Auto-generated from simple-icons-font — do not edit`,
    `export const validSlugs = new Set([`,
    ...slugs.map((s) => `    '${s}',`),
    `])`,
]

const jsPath = join(root, 'src/lib/utils/simple-icons-slugs.js')
mkdirSync(dirname(jsPath), { recursive: true })
writeFileSync(jsPath, jsLines.join('\n') + '\n')

console.log(`Generated ${icons.length} icons`)
console.log(`  ${cssPath}`)
console.log(`  ${jsPath}`)

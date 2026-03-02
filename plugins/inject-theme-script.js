import fs from 'fs'

export function injectThemeScript() {
    return {
        name: 'inject-theme-script',
        transformIndexHtml(html) {
            const themesCSS = fs.readFileSync(
                './src/lib/config/themes.css',
                'utf-8'
            )

            const styleTag = `<style>${themesCSS}</style>`

            return html
                .replace('</head>', `${styleTag}\n</head>`)
        },
    }
}

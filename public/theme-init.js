;(function () {
    const defaultTheme = 'default'

    try {
        const stored = localStorage.getItem('settings')
        let themeName = defaultTheme
        let parsed = null

        if (stored) {
            parsed = JSON.parse(stored)
            if (parsed?.currentTheme) {
                themeName = parsed.currentTheme
            }
        }

        if (themeName === 'custom' && parsed?.customThemeColors) {
            const c = parsed.customThemeColors
            const s = document.createElement('style')
            s.id = 'custom-theme-vars'
            s.textContent =
                ':root.theme-custom { --bg-1:' +
                c.bg1 +
                '; --bg-2:' +
                c.bg2 +
                '; --bg-3:' +
                c.bg3 +
                '; --txt-1:' +
                c.txt1 +
                '; --txt-2:' +
                c.txt2 +
                '; --txt-3:' +
                c.txt3 +
                '; --txt-4:' +
                c.txt4 +
                '; --txt-err:' +
                c.txtErr +
                '; }'
            document.head.appendChild(s)
        }

        document.documentElement.className = 'theme-' + themeName
    } catch (e) {
        document.documentElement.className = 'theme-' + defaultTheme
    }
})()

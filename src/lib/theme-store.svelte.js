import { defaultTheme, themes } from './themes.js'

function getCurrentTheme() {
    try {
        const stored = localStorage.getItem('themeSettings')
        if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.currentTheme && themes[parsed.currentTheme]) {
                return parsed.currentTheme
            }
        }
    } catch (error) {
        console.error('failed to load theme settings from localStorage:', error)
    }
    return defaultTheme
}

const themeState = $state({ current: getCurrentTheme() })

export function getTheme() {
    return themeState.current
}

export function setTheme(themeName) {
    const theme = themes[themeName]
    if (!theme) {
        console.error('Theme not found:', themeName)
        return
    }

    const root = document.documentElement
    const colors = theme.colors

    for (const [key, value] of Object.entries(colors)) {
        root.style.setProperty(key, value)
    }

    themeState.current = themeName
    try {
        localStorage.setItem(
            'themeSettings',
            JSON.stringify({ currentTheme: themeName })
        )
    } catch (error) {
        console.error('failed to save theme settings to localStorage:', error)
    }
}

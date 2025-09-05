import { defaultTheme, themes } from './themes.js'

const defaultThemeSettings = {
    currentTheme: defaultTheme,
}

function loadThemeSettings() {
    try {
        const stored = localStorage.getItem('themeSettings')
        if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.currentTheme && themes[parsed.currentTheme]) {
                return { ...defaultThemeSettings, ...parsed }
            }
        }
    } catch (error) {
        console.error('failed to load theme settings from localStorage:', error)
    }

    return defaultThemeSettings
}

export function saveThemeSettings(themeSettings) {
    try {
        localStorage.setItem('themeSettings', JSON.stringify(themeSettings))
    } catch (error) {
        console.error('failed to save theme settings to localStorage:', error)
    }
}

export const themeSettings = $state(loadThemeSettings())

export function applyTheme(themeName) {
    const theme = themes[themeName]
    if (!theme) {
        console.error('Theme not found:', themeName)
        return
    }

    const root = document.documentElement
    const colors = theme.colors

    root.style.setProperty('--bg-1', colors['bg-4'])
    root.style.setProperty('--bg-2', colors['bg-3'])
    root.style.setProperty('--bg-3', colors['bg-2'])
    root.style.setProperty('--bg-4', colors['bg-1'])

    root.style.setProperty('--txt-1', colors['text-1'])
    root.style.setProperty('--txt-2', colors['text-2'])
    root.style.setProperty('--txt-3', colors['text-3'])
    root.style.setProperty('--txt-4', colors['text-4'])

    root.style.setProperty('--txt-err', colors.error)

    themeSettings.currentTheme = themeName
    saveThemeSettings(themeSettings)
}

export function initializeTheme() {
    applyTheme(themeSettings.currentTheme)
}

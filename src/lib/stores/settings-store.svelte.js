import { defaultCustomColors } from '../config/themes.js'

function detectFormatPreferences() {
    try {
        const use24h = !new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
        }).resolvedOptions().hour12
        const dayBeforeMonth =
            new Intl.DateTimeFormat().formatToParts(new Date())[0].type ===
            'day'
        const useFahrenheit = navigator.language === 'en-US'
        const useImperial = useFahrenheit
        return {
            timeFormat: use24h ? '24hr' : '12hr',
            dateFormat: dayBeforeMonth ? 'dmy' : 'mdy',
            tempUnit: useFahrenheit ? 'fahrenheit' : 'celsius',
            speedUnit: useImperial ? 'mph' : 'kmh',
        }
    } catch {
        return {}
    }
}

let defaultSettings = {
    font: 'Geist Mono Variable',
    fontWeight: 400,
    currentTheme: 'default',
    tabTitle: '~',
    taskBackend: 'local',
    todoistApiToken: '',
    googleTasksSignedIn: false,
    microsoftTodoSignedIn: false,
    microsoftTodoClientId: '',
    microsoftTodoTenant: 'common',
    locationMode: 'manual',
    latitude: null,
    longitude: null,
    showSeconds: true,
    timeFormat: '12hr',
    dateFormat: 'mdy',
    tempUnit: 'fahrenheit',
    speedUnit: 'mph',
    forecastMode: 'hourly',
    linksPerColumn: 4,
    linkTarget: '_self',
    linkHotkeys: false,
    linkHotkeyPosition: 'right',
    linkIconMode: 'icons',
    links: [
        {
            title: 'gmail',
            url: 'https://mail.google.com',
            icon: 'gmail',
            hotkey: 'g',
        },
        {
            title: 'calendar',
            url: 'https://calendar.google.com',
            icon: 'googlecalendar',
            hotkey: 'c',
        },
        {
            title: 'drive',
            url: 'https://drive.google.com',
            icon: 'googledrive',
            hotkey: 'd',
        },
        {
            title: 'docs',
            url: 'https://docs.google.com',
            icon: 'googledocs',
            hotkey: 'o',
        },
        {
            title: 'github',
            url: 'https://github.com',
            icon: 'github',
            hotkey: 'i',
        },
        { title: 'slack', url: 'https://slack.com', icon: '', hotkey: 's' },
        {
            title: 'keep',
            url: 'https://keep.google.com',
            icon: 'googlekeep',
            hotkey: 'k',
        },
        {
            title: 'leetcode',
            url: 'https://leetcode.com/problemset',
            icon: 'leetcode',
            hotkey: 'l',
        },
        {
            title: 'perplexity',
            url: 'https://perplexity.ai',
            icon: 'perplexity',
            hotkey: 'p',
        },
        {
            title: 'claude',
            url: 'https://claude.ai',
            icon: 'claude',
            hotkey: 'a',
        },
        {
            title: 'gemini',
            url: 'https://gemini.google.com/',
            icon: 'googlegemini',
            hotkey: 'e',
        },
        {
            title: 'chatgpt',
            url: 'https://chatgpt.com/',
            icon: '',
            hotkey: 'h',
        },
        {
            title: 'youtube',
            url: 'https://youtube.com',
            icon: 'youtube',
            hotkey: 'y',
        },
        {
            title: 'reddit',
            url: 'https://reddit.com',
            icon: 'reddit',
            hotkey: 'r',
        },
        { title: 'twitter', url: 'https://x.com', icon: 'x', hotkey: 'x' },
        {
            title: 'feedly',
            url: 'https://feedly.com',
            icon: 'feedly',
            hotkey: 'f',
        },
    ],
    customThemeColors: { ...defaultCustomColors },
    pingUrl: 'https://www.google.com/generate_204',
    customCSS: '',
    showClock: true,
    showStats: true,
    showWeather: true,
    showTasks: true,
    showLinks: true,
}

function loadSettings() {
    try {
        const stored = localStorage.getItem('settings')
        if (stored) {
            const parsed = JSON.parse(stored)
            const merged = { ...defaultSettings, ...parsed }
            if (!merged.customThemeColors) {
                merged.customThemeColors = { ...defaultCustomColors }
            }
            // migrate old showLinkIcons boolean to linkIconMode
            if ('showLinkIcons' in parsed) {
                merged.linkIconMode =
                    parsed.showLinkIcons === false ? 'arrow' : 'icons'
                delete merged.showLinkIcons
            }
            // migrate links to add hotkey field
            if (merged.links) {
                merged.links = merged.links.map((link) => ({
                    ...link,
                    hotkey: link.hotkey ?? '',
                }))
            }
            return merged
        }
    } catch (error) {
        console.error('failed to load settings from localStorage:', error)
    }

    const detected = detectFormatPreferences()
    return { ...defaultSettings, ...detected }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem('settings', JSON.stringify(settings))
    } catch (error) {
        console.error('failed to save settings to localStorage:', error)
    }
}

export function resetSettings() {
    try {
        localStorage.removeItem('settings')
        // Reset the settings object to default
        const newSettings = loadSettings()
        Object.assign(settings, newSettings)
        return true
    } catch (error) {
        console.error('failed to reset settings:', error)
        return false
    }
}

export const settings = $state(loadSettings())

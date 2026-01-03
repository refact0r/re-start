import type { Settings } from './types'

const defaultSettings: Settings = {
    font: 'Geist Mono Variable',
    currentTheme: 'default',
    tabTitle: '~',
    // Integrations
    todoistApiToken: '',
    googleTasksSignedIn: false,
    unsplashApiKey: '',
    // Clock
    timeFormat: '24hr',
    dateFormat: 'dmy',
    // Weather
    showWeather: true,
    locationMode: 'manual',
    latitude: null,
    longitude: null,
    tempUnit: 'celsius',
    speedUnit: 'kmh',
    // Tasks
    showTasks: true,
    taskBackend: 'local',
    // Calendar
    showCalendar: true,
    selectedCalendars: [],
    // Background
    showBackground: false,
    backgroundOpacity: 0.85,
    // Links
    showLinks: true,
    showFavicons: true,
    linksPerColumn: 4,
    linkTarget: '_self',
    links: [
        { title: 'gmail', url: 'https://mail.google.com' },
        { title: 'calendar', url: 'https://calendar.google.com' },
        { title: 'drive', url: 'https://drive.google.com' },
        { title: 'docs', url: 'https://docs.google.com' },
        { title: 'github', url: 'https://github.com' },
        { title: 'slack', url: 'https://slack.com' },
        { title: 'keep', url: 'https://keep.google.com' },
        { title: 'leetcode', url: 'https://leetcode.com/problemset' },
        { title: 'perplexity', url: 'https://perplexity.ai' },
        { title: 'claude', url: 'https://claude.ai' },
        { title: 'aistudio', url: 'https://aistudio.google.com' },
        { title: 'chatgpt', url: 'https://chat.openai.com' },
        { title: 'youtube', url: 'https://youtube.com' },
        { title: 'reddit', url: 'https://reddit.com' },
        { title: 'twitter', url: 'https://x.com' },
        { title: 'feedly', url: 'https://feedly.com' },
    ],
    customCSS: '',
}

function loadSettings(): Settings {
    try {
        const stored = localStorage.getItem('settings')
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<Settings>
            return { ...defaultSettings, ...parsed }
        }
    } catch (error) {
        console.error('failed to load settings from localStorage:', error)
    }

    return defaultSettings
}

export function saveSettings(settingsToSave: Settings): void {
    try {
        localStorage.setItem('settings', JSON.stringify(settingsToSave))
    } catch (error) {
        console.error('failed to save settings to localStorage:', error)
    }
}

export function resetSettings(): boolean {
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

export const settings: Settings = $state(loadSettings())

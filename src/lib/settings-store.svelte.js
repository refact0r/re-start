let defaultSettings = {
    font: 'Geist Mono Variable',
    currentTheme: 'default',
    tabTitle: '~',
    taskBackend: 'local',
    todoistApiToken: '',
    locationMode: 'manual',
    latitude: null,
    longitude: null,
    timeFormat: '12hr',
    dateFormat: 'mdy',
    tempUnit: 'fahrenheit',
    speedUnit: 'mph',
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

function loadSettings() {
    try {
        const stored = localStorage.getItem('settings')
        if (stored) {
            const parsed = JSON.parse(stored)
            return { ...defaultSettings, ...parsed }
        }
    } catch (error) {
        console.error('failed to load settings from localStorage:', error)
    }

    return defaultSettings
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

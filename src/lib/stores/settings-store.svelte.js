import { defaultCustomColors } from '../config/themes.js'

export const MAIN_WIDGET_IDS = ['weather', 'tasks', 'calendar']

export function normalizeMainWidgetOrder(order) {
    if (!Array.isArray(order)) {
        return [...MAIN_WIDGET_IDS]
    }

    const normalized = []
    const seen = new Set()

    for (const id of order) {
        if (!MAIN_WIDGET_IDS.includes(id) || seen.has(id)) continue
        seen.add(id)
        normalized.push(id)
    }

    for (const id of MAIN_WIDGET_IDS) {
        if (!seen.has(id)) {
            normalized.push(id)
        }
    }

    return normalized
}

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
    currentTheme: 'default',
    tabTitle: '~',
    taskBackend: 'local',
    todoistApiToken: '',
    todoistVisibleProjectIds: null,
    googleTasksSignedIn: false,
    googleCalendarSignedIn: false,
    googleCalendarMaxEvents: 5,
    googleCalendarVisibleCalendarIds: null,
    locationMode: 'manual',
    latitude: null,
    longitude: null,
    timeFormat: '12hr',
    dateFormat: 'mdy',
    tempUnit: 'fahrenheit',
    speedUnit: 'mph',
    forecastMode: 'hourly',
    linksPerColumn: 4,
    linkTarget: '_self',
    linkIconMode: 'icons',
    links: [
        { title: 'gmail', url: 'https://mail.google.com', icon: 'gmail' },
        {
            title: 'calendar',
            url: 'https://calendar.google.com',
            icon: 'googlecalendar',
        },
        {
            title: 'drive',
            url: 'https://drive.google.com',
            icon: 'googledrive',
        },
        { title: 'docs', url: 'https://docs.google.com', icon: 'googledocs' },
        { title: 'github', url: 'https://github.com', icon: 'github' },
        { title: 'slack', url: 'https://slack.com', icon: '' },
        { title: 'keep', url: 'https://keep.google.com', icon: 'googlekeep' },
        {
            title: 'leetcode',
            url: 'https://leetcode.com/problemset',
            icon: 'leetcode',
        },
        {
            title: 'perplexity',
            url: 'https://perplexity.ai',
            icon: 'perplexity',
        },
        { title: 'claude', url: 'https://claude.ai', icon: 'claude' },
        {
            title: 'gemini',
            url: 'https://gemini.google.com/',
            icon: 'googlegemini',
        },
        { title: 'chatgpt', url: 'https://chatgpt.com/', icon: '' },
        { title: 'youtube', url: 'https://youtube.com', icon: 'youtube' },
        { title: 'reddit', url: 'https://reddit.com', icon: 'reddit' },
        { title: 'twitter', url: 'https://x.com', icon: 'x' },
        { title: 'feedly', url: 'https://feedly.com', icon: 'feedly' },
    ],
    customThemeColors: { ...defaultCustomColors },
    pingUrl: 'https://www.google.com/generate_204',
    customCSS: '',
    showClock: true,
    showStats: true,
    showWeather: true,
    showTasks: true,
    showCalendar: false,
    mainWidgetOrder: [...MAIN_WIDGET_IDS],
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
            // remove deprecated standalone radar widget setting
            delete merged.showWeatherRadar
            // remove deprecated pomodoro settings
            delete merged.showPomodoro
            delete merged.pomodoroFocusMinutes
            delete merged.pomodoroShortBreakMinutes
            delete merged.pomodoroLongBreakMinutes
            delete merged.pomodoroLongBreakEvery
            delete merged.pomodoroAutoStartBreaks
            delete merged.pomodoroAutoStartFocus
            delete merged.pomodoroSoundEnabled
            delete merged.pomodoroSoundType
            delete merged.pomodoroSoundVolume
            merged.mainWidgetOrder = normalizeMainWidgetOrder(
                merged.mainWidgetOrder
            )
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

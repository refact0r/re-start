// Error types (re-exported from errors.ts for convenience)
export {
    BackendErrorCode,
    BackendError,
    NetworkError,
    AuthError,
    RateLimitError,
    ValidationError,
    SyncError,
} from './errors'

// Theme types
export interface ThemeColors {
    '--bg-1': string
    '--bg-2': string
    '--bg-3': string
    '--txt-1': string
    '--txt-2': string
    '--txt-3': string
    '--txt-4': string
    '--txt-err': string
}

export interface Theme {
    displayName: string
    colors: ThemeColors
}

export type ThemeMap = Record<string, Theme>

// Link type
export interface Link {
    title: string
    url: string
}

// Settings types
export type TimeFormat = '12hr' | '24hr'
export type DateFormat = 'mdy' | 'dmy'
export type TempUnit = 'celsius' | 'fahrenheit'
export type SpeedUnit = 'kmh' | 'mph'
export type TaskBackendType = 'local' | 'todoist' | 'google-tasks'
export type LinkTarget = '_self' | '_blank'
export type LocationMode = 'auto' | 'manual'

export interface Settings {
    font: string
    currentTheme: string
    tabTitle: string
    customCSS: string
    // Integrations
    todoistApiToken: string
    googleTasksSignedIn: boolean
    unsplashApiKey: string
    // Clock
    timeFormat: TimeFormat
    dateFormat: DateFormat
    // Weather
    showWeather: boolean
    locationMode: LocationMode
    latitude: number | null
    longitude: number | null
    tempUnit: TempUnit
    speedUnit: SpeedUnit
    // Tasks
    showTasks: boolean
    taskBackend: TaskBackendType
    // Calendar
    showCalendar: boolean
    selectedCalendars: string[]
    // Background
    showBackground: boolean
    backgroundOpacity: number
    // Links
    showLinks: boolean
    showFavicons: boolean
    linksPerColumn: number
    linkTarget: LinkTarget
    links: Link[]
}

// Task types
export interface TaskDue {
    date: string
}

export interface RawTask {
    id: string
    content: string
    checked: boolean
    completed_at: string | null
    due: TaskDue | null
    project_id: string | null
    labels: string[]
    child_order: number
    is_deleted?: boolean
}

export interface EnrichedTask extends RawTask {
    project_name: string
    label_names: string[]
    due_date: Date | null
    has_time: boolean
}

// Calendar types
export interface GoogleCalendar {
    id: string
    name: string
    color: string
    primary: boolean
}

export interface CalendarEventRaw {
    id: string
    summary?: string
    description?: string
    location?: string
    hangoutLink?: string
    htmlLink?: string
    status?: string
    start: {
        date?: string
        dateTime?: string
    }
    end: {
        date?: string
        dateTime?: string
    }
    calendarId: string
    calendarName: string
    calendarColor: string
}

export interface CalendarEvent {
    id: string
    title: string
    description: string
    location: string
    hangoutLink: string
    startTime: Date
    endTime: Date
    isAllDay: boolean
    isPast: boolean
    isOngoing: boolean
    calendarName: string
    calendarColor: string
    htmlLink?: string
}

// Weather types
export interface CurrentWeatherRaw {
    temperature_2m: number
    weather_code: number
    relative_humidity_2m: number
    precipitation_probability: number
    wind_speed_10m: number
    apparent_temperature: number
    is_day: number
    time: string
}

export interface HourlyWeatherRaw {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    is_day: number[]
}

export interface WeatherApiResponse {
    current: CurrentWeatherRaw
    hourly: HourlyWeatherRaw
}

export interface ProcessedCurrentWeather {
    temperature_2m: string
    weather_code: number
    relative_humidity_2m: number
    precipitation_probability: number
    wind_speed_10m: string
    apparent_temperature: string
    is_day: number
    time: string
    description: string
}

export interface ForecastItem {
    time: string
    temperature: string
    weatherCode: number
    description: string
    formattedTime: string
}

export interface WeatherData {
    current: ProcessedCurrentWeather
    forecast: ForecastItem[]
}

export interface WeatherCacheData {
    raw?: WeatherApiResponse
    timestamp?: number
    latitude?: number
    longitude?: number
}

// Unsplash types
export interface UnsplashPhotographer {
    name: string
    username: string
    profileUrl: string
}

export interface UnsplashBackground {
    id: string
    url: string
    fullUrl: string
    thumbUrl: string
    blurHash: string
    color: string
    description: string | null
    photographer: UnsplashPhotographer
    unsplashUrl: string
    downloadLocation: string
    fetchDate: string
    topic: string
    stale?: boolean
}

// Date matcher types
export interface DateMatchPosition {
    start: number
    end: number
}

export interface TimeMatch {
    start: number
    end: number
    hour: number
    minute: number
    ampm: 'am' | 'pm' | null
    requiresDate?: boolean
}

export interface DateCandidate {
    date: Date
    match: DateMatchPosition
    hasTime: boolean
    dateProvided: boolean
}

export interface ParsedDate {
    date: string
    match: DateMatchPosition
    hasTime: boolean
}

export interface FormatOptions {
    timeFormat: TimeFormat
}

// Backend config types
export interface TaskBackendConfig {
    apiToken?: string
}

export interface CalendarBackendConfig {
    // Empty config for now, can be extended in the future
}

export interface GoogleCalendarData {
    calendars?: CalendarEventRaw[]
    events?: CalendarEventRaw[]
    timestamp?: number
}

// Google Auth types
export interface GoogleAuthToken {
    access_token: string
    expires_at: number
    refresh_token?: string
}

export interface GoogleUserInfo {
    email: string
    name?: string
}

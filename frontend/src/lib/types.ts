/**
 * @file Central type definitions for the re-start browser extension
 *
 * This file defines all TypeScript interfaces and types used throughout the application.
 * Types are organized into functional categories with comprehensive documentation explaining
 * their purpose, usage patterns, and relationships.
 *
 * ## Type Categories
 *
 * ### Core Application Types
 * - **Theme Types:** ThemeColors, Theme, ThemeMap - Color scheme system with CSS variable mapping
 * - **Settings Types:** Settings interface + type aliases (TimeFormat, DateFormat, etc.) - Application configuration
 * - **Link Types:** Link interface - Quick links grid system
 *
 * ### Task Management Types
 * - **RawTask:** Base task structure from providers (storage format with IDs)
 * - **EnrichedTask:** UI-ready task with resolved names (extends RawTask with computed properties)
 * - **TaskDue:** Due date structure for tasks
 * - **TaskProviderConfig:** Configuration for task provider backends
 *
 * ### Calendar Types
 * - **GoogleCalendar:** Calendar metadata for multi-calendar selection
 * - **CalendarEvent:** Processed event with computed display properties
 * - **CalendarProviderConfig:** Configuration for calendar providers (extensibility placeholder)
 *
 * ### Weather Types (Raw vs Processed Pattern)
 * - **Raw API Response:** CurrentWeatherRaw, HourlyWeatherRaw, WeatherApiResponse
 * - **Processed UI Data:** ProcessedCurrentWeather, ForecastItem, WeatherData
 * - **Cache Structure:** WeatherCacheData with validation metadata
 *
 * ### Background Image Types
 * - **UnsplashPhotographer:** Attribution data for image creators
 * - **UnsplashBackground:** Complete background image structure with daily refresh mechanism
 *
 * ### Date Parsing Types
 * - **DateMatchPosition:** Text position tracking for matches
 * - **TimeMatch:** Time expression match with AM/PM support
 * - **DateCandidate:** Internal candidate during parsing (with Date objects)
 * - **ParsedDate:** Final result with ISO string (public API)
 * - **FormatOptions:** Formatting configuration for date display
 *
 * ### Error Types
 * - Re-exported from errors.ts: BackendError, NetworkError, AuthError, etc.
 *
 * ## Key Design Patterns
 *
 * ### Raw vs Processed Pattern
 * Several data types follow a "Raw → Processed" transformation pattern to separate
 * API/storage concerns from UI presentation:
 *
 * **Weather Data Flow:**
 * ```
 * OpenMeteo API → WeatherApiResponse (raw numeric values)
 *   ↓ cache in localStorage
 * WeatherCacheData (raw + metadata)
 *   ↓ process on-demand
 * WeatherData (formatted strings + descriptions)
 *   ↓ display
 * Weather.svelte
 * ```
 *
 * **Task Data Flow:**
 * ```
 * Task Providers → RawTask (IDs, minimal data)
 *   ↓ enrich
 * EnrichedTask (resolved names, parsed dates)
 *   ↓ display
 * Tasks.svelte
 * ```
 *
 * **Benefits:**
 * - Efficient storage (IDs instead of full names, numeric values preserved)
 * - Consistent provider interface (all return same structure)
 * - Flexible formatting (re-process cached data without API calls)
 * - UI-optimized data (computed properties, formatted strings)
 *
 * ### Caching Strategy
 * Multiple types support localStorage caching with intelligent invalidation:
 *
 * **WeatherCacheData:**
 * - 15-minute Time-To-Live (TTL)
 * - Location-based invalidation (>0.1° coordinate change)
 * - Stores raw API response for re-processing
 *
 * **UnsplashBackground:**
 * - Daily refresh based on fetchDate comparison
 * - Lazy update (checks on load)
 * - Stale flag for fallback scenarios
 *
 * **Task Sync Tokens:**
 * - Incremental sync via provider-specific tokens
 * - Full sync fallback on token invalidation
 *
 * ### Type Safety Conventions
 * - **Optional properties:** Use `property?: Type` for truly optional fields
 * - **Nullable values:** Use `property: Type | null` when null has semantic meaning
 * - **Union types:** Use string literals for constrained values (e.g., TimeFormat = '12hr' | '24hr')
 * - **Enums:** Avoid TypeScript enums, use union types or const objects instead
 * - **Interfaces vs Types:** Prefer interfaces for objects, type aliases for unions/primitives
 *
 * ## Cross-References
 *
 * ### Key Implementation Files
 * - **settings-store.svelte.ts** - Settings state management with Svelte 5 runes
 * - **weather-api.ts** - Weather data fetching and transformation (Raw → Processed)
 * - **unsplash-api.ts** - Background image management with daily refresh
 * - **task-provider.ts** - Abstract base class for task providers (enrichment logic)
 * - **google-calendar-provider.ts** - Calendar event fetching and processing
 * - **date-matcher/** - Natural language date parsing implementation
 * - **errors.ts** - Error class definitions with consistent error handling
 * - **themes.ts** - Theme definitions using ThemeMap structure
 * - **App.svelte** - Root component applying settings via reactive effects
 *
 * ### External APIs
 * - **OpenMeteo API** - Weather data source (WeatherApiResponse structure)
 * - **Unsplash API** - Background images (UnsplashBackground structure)
 * - **Todoist Sync API v1** - Task sync (RawTask structure)
 * - **Google Tasks API** - Task management (RawTask structure)
 * - **Google Calendar API v3** - Calendar events (CalendarEvent structure)
 * - **Google Identity Services** - OAuth for Google APIs
 *
 * @see settings-store.svelte.ts for state management
 * @see weather-api.ts for weather data transformation
 * @see task-provider.ts for task enrichment process
 * @see errors.ts for error type definitions
 */

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

/**
 * CSS custom properties (variables) that define a theme's color palette.
 * These properties are injected into document.documentElement.style to apply the theme.
 *
 * Background colors (from darkest to lightest):
 * - `--bg-1`: Primary background (base layer)
 * - `--bg-2`: Secondary background (cards, panels)
 * - `--bg-3`: Tertiary background (hover states, highlights)
 *
 * Text colors (from most to least prominent):
 * - `--txt-1`: Primary text (headings, main content)
 * - `--txt-2`: Secondary text (body copy)
 * - `--txt-3`: Tertiary text (labels, muted content)
 * - `--txt-4`: Accent text (links, highlights)
 * - `--txt-err`: Error text (validation messages)
 *
 * @example
 * ```ts
 * const themeColors: ThemeColors = {
 *   '--bg-1': '#191724',
 *   '--bg-2': '#1f1d2e',
 *   '--bg-3': '#26233a',
 *   '--txt-1': '#e0def4',
 *   '--txt-2': 'hsl(248, 25%, 75%)',
 *   '--txt-3': '#31748f',
 *   '--txt-4': '#ebbcba',
 *   '--txt-err': '#eb6f92'
 * }
 * ```
 */
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

/**
 * Complete theme definition with display name and color palette.
 * Themes are stored in themes.ts and can be selected in Settings.
 * Theme application happens via reactive effects in App.svelte.
 *
 * @property displayName - Human-readable theme name shown in settings UI
 * @property colors - CSS variable values for this theme
 *
 * @see ThemeColors for CSS variable documentation
 * @see themes.ts for available theme definitions
 */
export interface Theme {
    displayName: string
    colors: ThemeColors
}

/**
 * Collection of available themes, keyed by theme identifier.
 * The theme identifier is used in settings.currentTheme and as the property key,
 * while Theme.displayName is shown to users in the UI.
 *
 * @example
 * ```ts
 * const themes: ThemeMap = {
 *   'rose-pine': {
 *     displayName: 'rosé pine',
 *     colors: { ... }
 *   },
 *   'tokyo-night': {
 *     displayName: 'tokyo night',
 *     colors: { ... }
 *   }
 * }
 * ```
 */
export type ThemeMap = Record<string, Theme>

// Link type

/**
 * Quick link definition displayed in the customizable links grid.
 * Links are shown in a responsive multi-column layout with drag-to-reorder support.
 * Users can configure links in Settings → Links section.
 *
 * @property title - Display text for the link (shown to user in grid)
 * @property url - Target URL (can be relative or absolute, http/https)
 *
 * **Layout and Display:**
 * - Links are organized into columns (responsive based on `settings.linksPerColumn`)
 * - Can display with favicons (when `settings.showFavicons` is true) or bullets
 * - Opens in current or new tab based on `settings.linkTarget`
 *
 * **User Customization:**
 * - Users can add, edit, delete, and reorder links
 * - Drag-and-drop reordering within the grid
 * - Stored in `settings.links` array
 *
 * @see Links.svelte for grid rendering implementation
 * @see Settings.svelte for link management UI
 *
 * @example
 * ```ts
 * const link: Link = {
 *   title: 'GitHub',
 *   url: 'https://github.com'
 * }
 * ```
 */
export interface Link {
    title: string
    url: string
}

// Settings types

/**
 * Clock time display format.
 * - `12hr`: 12-hour format with AM/PM (e.g., "2:30 PM")
 * - `24hr`: 24-hour format (e.g., "14:30")
 */
export type TimeFormat = '12hr' | '24hr'

/**
 * Date display format for month/day ordering.
 * - `mdy`: Month-Day-Year (e.g., "January 15, 2024")
 * - `dmy`: Day-Month-Year (e.g., "15 January 2024")
 */
export type DateFormat = 'mdy' | 'dmy'

/**
 * Temperature unit for weather display.
 * - `celsius`: Degrees Celsius (°C)
 * - `fahrenheit`: Degrees Fahrenheit (°F)
 */
export type TempUnit = 'celsius' | 'fahrenheit'

/**
 * Wind speed unit for weather display.
 * - `kmh`: Kilometers per hour (km/h)
 * - `mph`: Miles per hour (mph)
 */
export type SpeedUnit = 'kmh' | 'mph'

/**
 * Task provider backend type.
 * - `local`: Browser localStorage (offline, no sync)
 * - `todoist`: Todoist Sync API v1 integration
 * - `google-tasks`: Google Tasks API integration
 */
export type TaskProviderType = 'local' | 'todoist' | 'google-tasks'

/**
 * Browser target for opening quick links.
 * - `_self`: Open in current tab
 * - `_blank`: Open in new tab
 */
export type LinkTarget = '_self' | '_blank'

/**
 * Weather location detection mode.
 * - `auto`: Use browser geolocation API
 * - `manual`: Use user-specified latitude/longitude
 */
export type LocationMode = 'auto' | 'manual'

/**
 * Application settings stored in localStorage and managed by settings-store.svelte.ts.
 * Settings are organized into groups: Display, Integrations, Clock, Weather, Tasks,
 * Calendar, Background, and Links. Reactive effects in App.svelte apply changes.
 *
 * @property font - Font family name (e.g., "JetBrains Mono", "Fira Code"). Applied to document body.
 * @property currentTheme - Theme identifier key from ThemeMap (e.g., "rose-pine", "tokyo-night")
 * @property tabTitle - Browser tab title text
 * @property customCSS - User-provided CSS injected into page via <style> element
 *
 * **Integration Settings (API tokens and auth state)**
 * @property todoistApiToken - Todoist API token for task sync (required when taskBackend is 'todoist')
 * @property googleTasksSignedIn - Google OAuth sign-in state for Tasks/Calendar (managed by google-auth)
 * @property unsplashApiKey - Unsplash API key for background images (optional, uses demo key if not provided)
 *
 * **Clock Settings**
 * @property timeFormat - 12-hour or 24-hour time display format
 * @property dateFormat - Month-Day-Year or Day-Month-Year date ordering
 *
 * **Weather Settings**
 * @property showWeather - Toggle weather widget visibility
 * @property locationMode - Location detection method (auto geolocation or manual coordinates)
 * @property latitude - Manual location latitude (used when locationMode is 'manual')
 * @property longitude - Manual location longitude (used when locationMode is 'manual')
 * @property tempUnit - Temperature display unit (Celsius or Fahrenheit)
 * @property speedUnit - Wind speed display unit (km/h or mph)
 *
 * **Task Settings**
 * @property showTasks - Toggle task widget visibility
 * @property taskBackend - Task provider type (local storage, Todoist, or Google Tasks)
 *
 * **Calendar Settings**
 * @property showCalendar - Toggle calendar widget visibility
 * @property selectedCalendars - Array of Google Calendar IDs to display events from
 *
 * **Background Settings**
 * @property showBackground - Toggle Unsplash background image display
 * @property backgroundOpacity - Background image opacity (0-100), affects frosted glass effect
 *
 * **Links Settings**
 * @property showLinks - Toggle quick links grid visibility
 * @property showFavicons - Toggle favicon display for links
 * @property linksPerColumn - Number of links per column in responsive grid
 * @property linkTarget - Browser target for opening links (current tab or new tab)
 * @property links - Array of user-defined quick links with drag-to-reorder support
 *
 * @see settings-store.svelte.ts for state management
 * @see App.svelte for reactive effects that apply settings
 */
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
    taskBackend: TaskProviderType
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

/**
 * Due date information for a task.
 *
 * @property date - ISO 8601 date string in one of two formats:
 *   - Date only: `"YYYY-MM-DD"` (e.g., "2024-01-15") - represents end of day
 *   - Date with time: `"YYYY-MM-DDTHH:mm:ss"` (e.g., "2024-01-15T14:30:00") - specific time
 *
 * The format determines whether the task has a specific time or just a date.
 * During enrichment, dates without time are adjusted to 23:59:59 for proper sorting.
 *
 * @see EnrichedTask.has_time for whether the date includes time information
 */
export interface TaskDue {
    date: string
}

/**
 * Base task structure returned by all task providers (localStorage, Todoist, Google Tasks).
 * Represents tasks as stored/received from the backend before UI enrichment.
 *
 * **Raw vs Enriched Pattern:**
 * - **RawTask** = Storage format with IDs and minimal data
 * - **EnrichedTask** = Display format with resolved names and parsed dates
 *
 * This separation allows:
 * - Efficient storage (IDs instead of full names)
 * - Consistent provider interface (all return RawTask)
 * - UI-optimized data (enriched with computed properties)
 *
 * @property id - Unique task identifier (format varies by provider: UUID for localStorage, numeric for Todoist/Google)
 * @property content - Task description/title entered by user
 * @property checked - Completion status (true = completed, false = active)
 * @property completed_at - ISO 8601 timestamp when task was completed (null if not completed)
 * @property due - Due date information (null if no due date set)
 * @property project_id - Reference to parent project/list (null for default inbox/list)
 * @property labels - Array of label/tag IDs (resolved to names during enrichment)
 * @property child_order - Sort order within parent project/list (lower = higher priority)
 * @property is_deleted - Soft deletion flag (optional, used by some providers for sync)
 *
 * @see EnrichedTask for the UI-ready version with computed properties
 * @see TaskProvider for the enrichment implementation
 *
 * @example
 * ```ts
 * const rawTask: RawTask = {
 *   id: '123',
 *   content: 'Buy groceries',
 *   checked: false,
 *   completed_at: null,
 *   due: { date: '2024-01-15T14:00:00' },
 *   project_id: 'proj_456',
 *   labels: ['label_789'],
 *   child_order: 1
 * }
 * ```
 */
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

/**
 * Task enriched with computed UI-ready properties.
 * Extends RawTask with resolved names and parsed dates for display in the Tasks widget.
 *
 * **Enrichment Process:**
 * 1. Parse `due.date` string → `due_date` Date object
 * 2. Detect time presence → `has_time` boolean
 * 3. Resolve `project_id` → `project_name` string
 * 4. Resolve `labels` IDs → `label_names` array
 *
 * **When to Use:**
 * - **TaskProvider.getTasks()** returns EnrichedTask[] (for UI display)
 * - **TaskProvider internal storage** uses RawTask (efficient storage)
 * - **Tasks.svelte** consumes EnrichedTask (shows project_name, formatted due_date)
 *
 * **Computed Properties (added during enrichment):**
 * @property project_name - Resolved project/list name (empty string for default inbox)
 * @property label_names - Resolved label/tag names (empty array if no labels)
 * @property due_date - Parsed due date as Date object (null if no due date)
 * @property has_time - Whether the due date includes specific time (true) or is date-only (false)
 *
 * **Sorting and Filtering:**
 * - Unchecked tasks shown first, then completed tasks (if within 5-minute threshold)
 * - Sorted by: completion time (recent first) → due date (earliest first) → project → child_order
 * - Recently completed tasks (< 5 minutes ago) are shown briefly before auto-hiding
 *
 * @see RawTask for the base storage structure
 * @see TaskProvider.getTasks() for the enrichment implementation
 * @see TaskProvider.sortTasks() for sorting logic
 *
 * @example
 * ```ts
 * const enrichedTask: EnrichedTask = {
 *   // ... all RawTask properties
 *   id: '123',
 *   content: 'Buy groceries',
 *   checked: false,
 *   completed_at: null,
 *   due: { date: '2024-01-15T14:00:00' },
 *   project_id: 'proj_456',
 *   labels: ['label_789'],
 *   child_order: 1,
 *   // ... plus enriched properties
 *   project_name: 'Shopping',
 *   label_names: ['urgent'],
 *   due_date: new Date('2024-01-15T14:00:00'),
 *   has_time: true
 * }
 * ```
 */
export interface EnrichedTask extends RawTask {
    project_name: string
    label_names: string[]
    due_date: Date | null
    has_time: boolean
}

// Calendar types

/**
 * Google Calendar metadata for calendar selection.
 * Represents a single calendar from the user's Google Calendar account.
 * Used in Settings → Calendar section for multi-calendar selection.
 *
 * @property id - Unique calendar identifier (e.g., email address or calendar ID)
 * @property name - Display name of the calendar (e.g., "Work", "Personal")
 * @property color - Background color for calendar in hex format (e.g., "#9fc6e7")
 * @property primary - Whether this is the user's primary calendar (typically matches their email)
 *
 * **Usage:**
 * - **fetchCalendarList()** returns GoogleCalendar[] for settings UI
 * - **settings.selectedCalendars** stores array of calendar IDs to display
 * - Calendar selection filters which events are shown in Calendar widget
 *
 * @see GoogleCalendarProvider.fetchCalendarList() for retrieving calendar list
 * @see Settings.selectedCalendars for storing user's calendar selection
 * @see Calendar.svelte for displaying events from selected calendars
 *
 * @example
 * ```ts
 * const calendar: GoogleCalendar = {
 *   id: 'user@gmail.com',
 *   name: 'Personal',
 *   color: '#9fc6e7',
 *   primary: true
 * }
 * ```
 */
export interface GoogleCalendar {
    id: string
    name: string
    color: string
    primary: boolean
}

/**
 * Processed calendar event ready for UI display in the Calendar widget.
 * Represents a single event from Google Calendar API with computed display properties.
 * Events are fetched for today only and sorted by all-day status and start time.
 *
 * **Event Properties:**
 * @property id - Unique event identifier from Google Calendar
 * @property title - Event summary/title (defaults to "(No title)" if missing)
 * @property description - Event description/notes (empty string if none)
 * @property location - Physical or virtual location (empty string if none)
 * @property hangoutLink - Google Meet/Hangouts video link (empty string if none)
 * @property htmlLink - Link to event in Google Calendar web UI
 *
 * **Time Properties:**
 * @property startTime - Event start time as Date object
 * @property endTime - Event end time as Date object
 *
 * **Computed Display Properties:**
 * @property isAllDay - Whether event is all-day (no specific times)
 * @property isPast - Whether event has ended (endTime < now)
 * @property isOngoing - Whether event is currently happening (startTime <= now < endTime)
 *
 * **Calendar Metadata:**
 * @property calendarName - Name of parent calendar (e.g., "Work", "Personal")
 * @property calendarColor - Color from parent calendar for visual grouping
 *
 * **Event Sorting:**
 * - All-day events displayed first
 * - Then sorted by start time (earliest first)
 * - Past events shown with reduced opacity
 * - Ongoing events highlighted
 *
 * **API Integration:**
 * - Fetched from Google Calendar API v3
 * - Only today's events are retrieved (start of day to 23:59:59)
 * - Cancelled events are filtered out
 * - 5-minute cache with auto-refresh on tab focus
 *
 * @see GoogleCalendarProvider.getEvents() for event fetching and transformation
 * @see GoogleCalendarProvider.sync() for API sync logic
 * @see Calendar.svelte for event display implementation
 *
 * @example
 * ```ts
 * const event: CalendarEvent = {
 *   id: 'event123',
 *   title: 'Team Meeting',
 *   description: 'Weekly sync',
 *   location: '',
 *   hangoutLink: 'https://meet.google.com/abc-defg-hij',
 *   startTime: new Date('2024-01-15T14:00:00'),
 *   endTime: new Date('2024-01-15T15:00:00'),
 *   isAllDay: false,
 *   isPast: false,
 *   isOngoing: true,
 *   calendarName: 'Work',
 *   calendarColor: '#9fc6e7',
 *   htmlLink: 'https://calendar.google.com/event?eid=...'
 * }
 * ```
 */
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

/**
 * Raw current weather data from OpenMeteo API.
 * Represents real-time weather conditions at a specific location as received from the API.
 * This is the unprocessed response structure before transformation to UI-ready format.
 *
 * **API Source:** [OpenMeteo Forecast API](https://open-meteo.com/en/docs)
 *
 * **Raw vs Processed Pattern:**
 * - **CurrentWeatherRaw** = Raw API response with numeric values
 * - **ProcessedCurrentWeather** = UI-ready data with formatted strings and description
 *
 * @property temperature_2m - Temperature at 2 meters above ground
 *   - Unit: Celsius or Fahrenheit (based on `tempUnit` setting)
 *   - Processed to: String with no decimals (e.g., "23")
 *
 * @property weather_code - WMO Weather interpretation code
 *   - Range: 0-99 (e.g., 0 = clear sky, 61 = slight rain, 95 = thunderstorm)
 *   - Mapped to: Human-readable description via descriptions.json (e.g., "clear sky", "rainy")
 *   - Day/night variations: Same code has different descriptions based on `is_day`
 *
 * @property relative_humidity_2m - Relative humidity at 2 meters
 *   - Unit: Percentage (0-100)
 *   - No transformation (used as-is in UI)
 *
 * @property precipitation_probability - Probability of precipitation
 *   - Unit: Percentage (0-100)
 *   - No transformation (used as-is in UI)
 *
 * @property wind_speed_10m - Wind speed at 10 meters above ground
 *   - Unit: km/h or mph (based on `speedUnit` setting)
 *   - Processed to: String with no decimals (e.g., "12")
 *
 * @property apparent_temperature - "Feels like" temperature accounting for wind chill and humidity
 *   - Unit: Celsius or Fahrenheit (based on `tempUnit` setting)
 *   - Processed to: String with no decimals (e.g., "21")
 *
 * @property is_day - Day/night indicator for weather description variations
 *   - Value: 1 = daytime, 0 = nighttime
 *   - Used to select day/night descriptions (e.g., "clear sky" vs "clear night")
 *
 * @property time - Timestamp of current weather observation
 *   - Format: ISO 8601 string (e.g., "2024-01-15T14:30:00")
 *   - Timezone: Automatic based on location (via API's `timezone: 'auto'`)
 *   - Used as reference point for hourly forecast processing
 *
 * **Caching:**
 * - Cached in localStorage with 15-minute TTL
 * - Cache invalidated when coordinates change by >0.1 degrees
 * - Cache key: 'weather_data'
 *
 * @see ProcessedCurrentWeather for the UI-ready transformed version
 * @see WeatherAPI.sync() for fetching from OpenMeteo API
 * @see WeatherAPI._processCurrentWeather() for transformation logic
 * @see descriptions.json for weather code to description mapping
 *
 * @example
 * ```ts
 * const rawWeather: CurrentWeatherRaw = {
 *   temperature_2m: 23.4,
 *   weather_code: 0,
 *   relative_humidity_2m: 65,
 *   precipitation_probability: 10,
 *   wind_speed_10m: 12.5,
 *   apparent_temperature: 21.8,
 *   is_day: 1,
 *   time: '2024-01-15T14:30:00'
 * }
 * // Processed to:
 * // { temperature_2m: "23", description: "clear sky", ... }
 * ```
 */
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

/**
 * Raw hourly weather forecast data from OpenMeteo API.
 * Represents 24-hour forecast with parallel arrays for each weather parameter.
 * Each array index corresponds to the same hour across all properties.
 *
 * **API Source:** [OpenMeteo Forecast API](https://open-meteo.com/en/docs)
 *
 * **Array Structure:**
 * All arrays have the same length (24 elements for 24-hour forecast).
 * Each index represents the same hour:
 * - time[0], temperature_2m[0], weather_code[0], is_day[0] = Hour 0 data
 * - time[1], temperature_2m[1], weather_code[1], is_day[1] = Hour 1 data
 * - ... and so on
 *
 * **Processing:**
 * The Weather widget displays 5 forecasts at 3-hour intervals starting 3 hours from now.
 * Example: If current time is 14:00, show forecasts for 17:00, 20:00, 23:00, 02:00, 05:00.
 *
 * @property time - Array of hourly timestamps
 *   - Format: ISO 8601 strings (e.g., ["2024-01-15T14:00:00", "2024-01-15T15:00:00", ...])
 *   - Length: 24 hours
 *   - Timezone: Automatic based on location
 *   - Used to find current hour index and calculate forecast intervals
 *
 * @property temperature_2m - Array of hourly temperatures at 2 meters above ground
 *   - Unit: Celsius or Fahrenheit (based on `tempUnit` setting)
 *   - Processed to: String with no decimals for each forecast item
 *
 * @property weather_code - Array of hourly WMO weather codes
 *   - Range: 0-99 for each element
 *   - Mapped to: Human-readable descriptions for each forecast hour
 *
 * @property is_day - Array of day/night indicators
 *   - Value: 1 = daytime, 0 = nighttime for each hour
 *   - Used to select appropriate weather description variant
 *
 * **Caching:**
 * - Part of WeatherApiResponse cached with current weather data
 * - Same 15-minute TTL and coordinate-based invalidation
 *
 * @see ForecastItem for the processed forecast entry shown in UI
 * @see WeatherAPI._processHourlyForecast() for array processing and filtering logic
 * @see Weather.svelte for forecast display (5 items at 3-hour intervals)
 *
 * @example
 * ```ts
 * const hourlyWeather: HourlyWeatherRaw = {
 *   time: [
 *     '2024-01-15T14:00:00',
 *     '2024-01-15T15:00:00',
 *     '2024-01-15T16:00:00',
 *     // ... 21 more hours
 *   ],
 *   temperature_2m: [23.4, 24.1, 24.8, ...],
 *   weather_code: [0, 0, 1, ...],
 *   is_day: [1, 1, 1, ...]
 * }
 * // Processed to 5 ForecastItems at 3-hour intervals
 * ```
 */
export interface HourlyWeatherRaw {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    is_day: number[]
}

/**
 * Complete weather API response from OpenMeteo.
 * Top-level wrapper containing both current conditions and hourly forecast data.
 * This structure matches the JSON response from OpenMeteo Forecast API.
 *
 * **API Endpoint:** `https://api.open-meteo.com/v1/forecast`
 *
 * **Request Parameters:**
 * - latitude, longitude: Location coordinates
 * - current: temperature_2m, weather_code, relative_humidity_2m, precipitation_probability,
 *           wind_speed_10m, apparent_temperature, is_day
 * - hourly: temperature_2m, weather_code, is_day
 * - timezone: auto (automatically detect timezone for location)
 * - forecast_hours: 24 (24-hour forecast)
 * - temperature_unit: celsius or fahrenheit (from user settings)
 * - wind_speed_unit: kmh or mph (from user settings)
 *
 * **Data Flow:**
 * 1. **Fetch:** WeatherAPI.sync() fetches from OpenMeteo API
 * 2. **Cache:** Raw response stored in localStorage with metadata
 * 3. **Transform:** WeatherAPI.getWeather() processes raw data to WeatherData
 * 4. **Display:** Weather.svelte renders ProcessedCurrentWeather + ForecastItem[]
 *
 * @property current - Real-time weather conditions at location
 * @property hourly - 24-hour forecast with parallel arrays for each parameter
 *
 * **Caching Strategy:**
 * - Stored in localStorage under 'weather_data' key
 * - 15-minute Time-To-Live (TTL)
 * - Invalidated when coordinates change by >0.1 degrees
 * - Includes timestamp and coordinates for cache validation
 *
 * @see WeatherCacheData for the localStorage cache structure
 * @see WeatherData for the processed UI-ready structure
 * @see WeatherAPI for the client implementation
 * @see CurrentWeatherRaw for current weather structure details
 * @see HourlyWeatherRaw for forecast array structure details
 *
 * @example
 * ```ts
 * const apiResponse: WeatherApiResponse = {
 *   current: {
 *     temperature_2m: 23.4,
 *     weather_code: 0,
 *     // ... other current weather fields
 *   },
 *   hourly: {
 *     time: ['2024-01-15T14:00:00', '2024-01-15T15:00:00', ...],
 *     temperature_2m: [23.4, 24.1, ...],
 *     weather_code: [0, 0, ...],
 *     is_day: [1, 1, ...]
 *   }
 * }
 * ```
 */
export interface WeatherApiResponse {
    current: CurrentWeatherRaw
    hourly: HourlyWeatherRaw
}

/**
 * Processed current weather data ready for UI display in Weather widget.
 * Represents the transformation of CurrentWeatherRaw from numeric API values to
 * formatted strings and human-readable descriptions for direct display.
 *
 * **Raw vs Processed Pattern:**
 * - **CurrentWeatherRaw** = Raw numeric values from OpenMeteo API
 * - **ProcessedCurrentWeather** = UI-ready strings with descriptions
 *
 * **Transformation Process (WeatherAPI._processCurrentWeather):**
 * 1. Convert numeric temperatures to strings with no decimals (e.g., 23.4 → "23")
 * 2. Convert wind speed to string with no decimals (e.g., 12.5 → "12")
 * 3. Map weather_code + is_day to human-readable description via descriptions.json
 * 4. Preserve other numeric values as-is (humidity, precipitation probability)
 *
 * @property temperature_2m - Formatted temperature string without decimals (e.g., "23")
 *   - Transformed from: number (CurrentWeatherRaw.temperature_2m)
 *   - Unit label added by Weather.svelte (e.g., "23°C" or "23°F")
 *
 * @property weather_code - WMO weather code (preserved from raw data)
 *   - Used for icon selection in UI
 *   - Same as CurrentWeatherRaw.weather_code
 *
 * @property relative_humidity_2m - Humidity percentage (preserved from raw data)
 *   - Range: 0-100
 *   - Displayed with % symbol in Weather.svelte
 *
 * @property precipitation_probability - Precipitation chance percentage (preserved from raw data)
 *   - Range: 0-100
 *   - Displayed with % symbol in Weather.svelte
 *
 * @property wind_speed_10m - Formatted wind speed string without decimals (e.g., "12")
 *   - Transformed from: number (CurrentWeatherRaw.wind_speed_10m)
 *   - Unit label added by Weather.svelte (e.g., "12 km/h" or "12 mph")
 *
 * @property apparent_temperature - Formatted "feels like" temperature without decimals (e.g., "21")
 *   - Transformed from: number (CurrentWeatherRaw.apparent_temperature)
 *   - Unit label added by Weather.svelte (e.g., "21°C" or "21°F")
 *
 * @property is_day - Day/night indicator (preserved from raw data)
 *   - Value: 1 = daytime, 0 = nighttime
 *   - Used for icon selection in UI
 *
 * @property time - ISO 8601 timestamp (preserved from raw data)
 *   - Format: "2024-01-15T14:30:00"
 *   - Timezone: Automatic based on location
 *
 * @property description - Human-readable weather description (computed during processing)
 *   - Mapped from weather_code via descriptions.json
 *   - Day/night variants (e.g., "clear sky" vs "clear night")
 *   - Lowercased for consistent display (e.g., "partly cloudy", "rainy")
 *
 * **Usage:**
 * - **WeatherAPI.getWeather()** returns ProcessedCurrentWeather in WeatherData.current
 * - **Weather.svelte** displays the processed data directly
 * - **WeatherAPI._processCurrentWeather()** performs the transformation
 *
 * @see CurrentWeatherRaw for the raw API response structure
 * @see WeatherData for the combined current + forecast structure
 * @see WeatherAPI._processCurrentWeather() for transformation logic
 * @see Weather.svelte for UI rendering
 * @see descriptions.json for weather code to description mapping
 *
 * @example
 * ```ts
 * // Raw API response:
 * const raw: CurrentWeatherRaw = {
 *   temperature_2m: 23.4,
 *   weather_code: 0,
 *   relative_humidity_2m: 65,
 *   precipitation_probability: 10,
 *   wind_speed_10m: 12.5,
 *   apparent_temperature: 21.8,
 *   is_day: 1,
 *   time: '2024-01-15T14:30:00'
 * }
 *
 * // Processed for UI:
 * const processed: ProcessedCurrentWeather = {
 *   temperature_2m: "23",         // Formatted, no decimals
 *   weather_code: 0,
 *   relative_humidity_2m: 65,
 *   precipitation_probability: 10,
 *   wind_speed_10m: "12",         // Formatted, no decimals
 *   apparent_temperature: "21",   // Formatted, no decimals
 *   is_day: 1,
 *   time: '2024-01-15T14:30:00',
 *   description: "clear sky"      // Added from weather_code + is_day
 * }
 * ```
 */
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

/**
 * Single forecast entry in the hourly weather forecast displayed in Weather widget.
 * Represents one time point (3-hour intervals) in the 5-item forecast shown below current weather.
 *
 * **Forecast Display Pattern:**
 * Weather widget shows 5 forecasts at 3-hour intervals starting 3 hours from now.
 * Example: If current time is 14:00, display forecasts for 17:00, 20:00, 23:00, 02:00, 05:00.
 *
 * **Data Source:**
 * Extracted from HourlyWeatherRaw arrays by WeatherAPI._processHourlyForecast():
 * 1. Find current hour index in hourly.time array
 * 2. Take every 3rd hour starting from (current + 3) hours
 * 3. Create ForecastItem for each selected hour
 * 4. Maximum of 5 items (limited by UI space)
 *
 * @property time - ISO 8601 timestamp for this forecast point
 *   - Format: "2024-01-15T17:00:00"
 *   - Timezone: Automatic based on location
 *   - Source: HourlyWeatherRaw.time[index]
 *
 * @property temperature - Formatted temperature string without decimals (e.g., "25")
 *   - Transformed from: HourlyWeatherRaw.temperature_2m[index] (number → string)
 *   - Conversion: `temp.toFixed(0)`
 *   - Unit label added by Weather.svelte (e.g., "25°C" or "25°F")
 *
 * @property weatherCode - WMO weather interpretation code for this hour
 *   - Range: 0-99 (e.g., 0 = clear, 61 = slight rain, 95 = thunderstorm)
 *   - Source: HourlyWeatherRaw.weather_code[index]
 *   - Used for icon selection in Weather.svelte
 *
 * @property description - Human-readable weather description for this hour
 *   - Mapped from weatherCode via descriptions.json
 *   - Day/night variants based on HourlyWeatherRaw.is_day[index]
 *   - Lowercased (e.g., "partly cloudy", "rainy", "clear night")
 *   - Displayed as hover tooltip or subtitle in Weather.svelte
 *
 * @property formattedTime - Display-ready time string based on user's time format preference
 *   - 12-hour format: "5pm", "11am" (lowercase, no space)
 *   - 24-hour format: "17:00", "23:00" (HH:mm)
 *   - Formatted by WeatherAPI._formatTime() using user's timeFormat setting
 *   - Displayed as primary label for each forecast item
 *
 * **Transformation Example:**
 * ```ts
 * // From HourlyWeatherRaw arrays:
 * hourly.time[10] = "2024-01-15T17:00:00"
 * hourly.temperature_2m[10] = 25.3
 * hourly.weather_code[10] = 1
 * hourly.is_day[10] = 1
 *
 * // Processed to ForecastItem:
 * {
 *   time: "2024-01-15T17:00:00",
 *   temperature: "25",              // Formatted from 25.3
 *   weatherCode: 1,
 *   description: "mainly clear",    // From code 1 + is_day
 *   formattedTime: "5pm"            // From time + timeFormat
 * }
 * ```
 *
 * **Usage:**
 * - **WeatherAPI._processHourlyForecast()** creates ForecastItem[] from raw hourly arrays
 * - **WeatherData.forecast** stores array of ForecastItems (max 5)
 * - **Weather.svelte** displays each ForecastItem in horizontal forecast strip
 *
 * @see HourlyWeatherRaw for the raw array structure source
 * @see WeatherData for the container structure
 * @see WeatherAPI._processHourlyForecast() for extraction and formatting logic
 * @see Weather.svelte for UI rendering of forecast items
 */
export interface ForecastItem {
    time: string
    temperature: string
    weatherCode: number
    description: string
    formattedTime: string
}

/**
 * Complete weather data structure combining current conditions and forecast.
 * This is the top-level UI-ready structure returned by WeatherAPI.getWeather()
 * and consumed by Weather.svelte for display.
 *
 * **Data Flow:**
 * 1. **API Fetch:** WeatherAPI.sync() fetches WeatherApiResponse from OpenMeteo
 * 2. **Cache:** Raw API response stored in localStorage as WeatherCacheData
 * 3. **Transform:** WeatherAPI.getWeather() processes raw data → WeatherData
 * 4. **Display:** Weather.svelte renders current + forecast
 *
 * **Caching Strategy:**
 * - WeatherData is NOT cached directly (cached as WeatherApiResponse in WeatherCacheData)
 * - Processed on-demand from cached raw data via getWeather()
 * - Allows different timeFormat settings without re-fetching from API
 * - 15-minute TTL on underlying cache
 *
 * @property current - Current weather conditions ready for display
 *   - Processed from WeatherApiResponse.current
 *   - Contains formatted strings (temperatures, wind speed) and description
 *   - Displayed in main weather card with large temperature
 *
 * @property forecast - Array of upcoming hourly forecasts (up to 5 items)
 *   - Processed from WeatherApiResponse.hourly arrays
 *   - 3-hour intervals starting 3 hours from now
 *   - Each item contains formatted temperature, time, and description
 *   - Displayed in horizontal strip below current weather
 *   - Empty array if no forecast data available
 *
 * **Processing:**
 * - **current:** Numeric values → strings, weather_code → description
 * - **forecast:** Array slicing at 3-hour intervals, time formatting based on user settings
 *
 * **Usage:**
 * - **WeatherAPI.getWeather(timeFormat)** returns WeatherData (or null if no cache)
 * - **Weather.svelte** calls getWeather() and renders the structure
 * - **App.svelte** manages weather sync lifecycle (on load, on focus, invalidation)
 *
 * @see ProcessedCurrentWeather for current weather structure details
 * @see ForecastItem for individual forecast entry details
 * @see WeatherApiResponse for the raw API response structure
 * @see WeatherCacheData for the cache storage structure
 * @see WeatherAPI.getWeather() for the processing logic
 * @see Weather.svelte for UI rendering
 *
 * @example
 * ```ts
 * const weatherData: WeatherData = {
 *   current: {
 *     temperature_2m: "23",
 *     weather_code: 0,
 *     relative_humidity_2m: 65,
 *     precipitation_probability: 10,
 *     wind_speed_10m: "12",
 *     apparent_temperature: "21",
 *     is_day: 1,
 *     time: '2024-01-15T14:30:00',
 *     description: "clear sky"
 *   },
 *   forecast: [
 *     {
 *       time: "2024-01-15T17:00:00",
 *       temperature: "25",
 *       weatherCode: 1,
 *       description: "mainly clear",
 *       formattedTime: "5pm"
 *     },
 *     // ... 4 more forecast items at 3-hour intervals
 *   ]
 * }
 * ```
 */
export interface WeatherData {
    current: ProcessedCurrentWeather
    forecast: ForecastItem[]
}

/**
 * localStorage cache structure for weather data with validation metadata.
 * Stores raw API responses along with timestamp and coordinates for cache invalidation.
 * Used by WeatherAPI to minimize OpenMeteo API calls and provide offline functionality.
 *
 * **Cache Storage:**
 * - **Key:** 'weather_data' in localStorage
 * - **Format:** JSON stringified WeatherCacheData
 * - **TTL:** 15 minutes (900,000 milliseconds)
 * - **Invalidation:** Time expiry OR coordinate change >0.1 degrees
 *
 * **Cache Invalidation Triggers:**
 * 1. **Time-based:** Cache older than 15 minutes (WeatherAPI.isCacheStale)
 * 2. **Location-based:** Coordinates changed by >0.1 degrees (WeatherAPI._coordinatesChanged)
 * 3. **Manual:** User clicks refresh or changes location mode (WeatherAPI.invalidateCache)
 * 4. **Reset:** Settings change or data corruption (WeatherAPI.clearLocalData)
 *
 * **Why Cache Raw Data:**
 * - Allows re-processing without API call (e.g., timeFormat change 12hr ↔ 24hr)
 * - Enables offline display of last fetched weather
 * - Reduces API load during repeated page views within 15 minutes
 * - Preserves numeric precision until display formatting
 *
 * @property raw - Raw API response from OpenMeteo (undefined if no cache)
 *   - Contains current weather + hourly forecast arrays
 *   - Processed on-demand by WeatherAPI.getWeather() → WeatherData
 *   - Numeric values preserved (not formatted) for flexibility
 *
 * @property timestamp - Unix timestamp (milliseconds) when data was fetched (undefined if no cache)
 *   - Set by: Date.now() during WeatherAPI.sync()
 *   - Used for: TTL validation in isCacheStale()
 *   - Example: 1705329000000 (2024-01-15 14:30:00 UTC)
 *
 * @property latitude - Latitude coordinate for cached weather (undefined if no cache)
 *   - Precision: Decimal degrees (e.g., 37.7749)
 *   - Used for: Location-based cache invalidation
 *   - Cache invalidated if new latitude differs by >0.1 degrees
 *
 * @property longitude - Longitude coordinate for cached weather (undefined if no cache)
 *   - Precision: Decimal degrees (e.g., -122.4194)
 *   - Used for: Location-based cache invalidation
 *   - Cache invalidated if new longitude differs by >0.1 degrees
 *
 * **All Properties Optional:**
 * - Empty object {} represents "no cache" state
 * - Partial data (e.g., only timestamp) treated as invalid
 * - WeatherAPI.getWeather() returns null if raw is missing
 *
 * **Cache Lifecycle:**
 * 1. **Load:** Constructor loads from localStorage via _loadFromStorage()
 * 2. **Check:** isCacheStale() validates TTL and coordinates before use
 * 3. **Fetch:** sync() fetches fresh data if stale, updates cache
 * 4. **Save:** _saveToStorage() persists to localStorage after sync()
 * 5. **Process:** getWeather() transforms cached raw → WeatherData on-demand
 *
 * **Usage:**
 * - **WeatherAPI.data** stores active cache instance
 * - **WeatherAPI.sync()** updates cache with fresh API data
 * - **WeatherAPI.getWeather()** reads cache and processes to WeatherData
 * - **WeatherAPI.isCacheStale()** validates cache before use
 * - **Weather.svelte** triggers sync when cache is stale
 *
 * @see WeatherApiResponse for the raw data structure
 * @see WeatherData for the processed UI-ready structure
 * @see WeatherAPI for cache management implementation
 * @see WeatherAPI.isCacheStale() for validation logic
 * @see WeatherAPI.sync() for cache update logic
 *
 * @example
 * ```ts
 * // Fresh cache from successful sync:
 * const cache: WeatherCacheData = {
 *   raw: {
 *     current: { temperature_2m: 23.4, weather_code: 0, ... },
 *     hourly: { time: [...], temperature_2m: [...], ... }
 *   },
 *   timestamp: 1705329000000,
 *   latitude: 37.7749,
 *   longitude: -122.4194
 * }
 *
 * // Empty cache (no data):
 * const emptyCache: WeatherCacheData = {}
 *
 * // Stale cache (>15 minutes old or coordinates changed):
 * // isCacheStale() returns true, triggers sync()
 * ```
 */
export interface WeatherCacheData {
    raw?: WeatherApiResponse
    timestamp?: number
    latitude?: number
    longitude?: number
}

// Unsplash types

/**
 * Photographer attribution data for Unsplash background images.
 * Contains metadata about the image creator, required by Unsplash API guidelines
 * for proper attribution when displaying their images.
 *
 * **Attribution Requirements:**
 * - Display photographer name with link to their profile
 * - Required by Unsplash API Terms of Service
 * - Shown in background image attribution UI
 *
 * @property name - Full display name of the photographer (e.g., "John Doe")
 *   - Extracted from Unsplash API response user.name
 *   - Displayed as primary credit text
 *   - Human-readable format
 *
 * @property username - Unsplash username/handle (e.g., "johndoe")
 *   - Extracted from Unsplash API response user.username
 *   - Used to construct profile URL
 *   - Alphanumeric with possible underscores/hyphens
 *
 * @property profileUrl - Full URL to photographer's Unsplash profile
 *   - Format: `https://unsplash.com/@{username}`
 *   - Extracted from Unsplash API response user.links.html
 *   - Opens in new tab when user clicks attribution
 *   - Includes UTM tracking as per Unsplash guidelines
 *
 * **Usage:**
 * - **fetchFromUnsplash()** extracts photographer data from API response
 * - **UnsplashBackground.photographer** embeds this structure
 * - **Background UI** displays attribution with clickable link
 * - **API Compliance** ensures proper credit to photographers
 *
 * @see UnsplashBackground for the complete background image structure
 * @see unsplash-api.ts for API integration and data extraction
 *
 * @example
 * ```ts
 * const photographer: UnsplashPhotographer = {
 *   name: "Pawel Czerwinski",
 *   username: "pawel_czerwinski",
 *   profileUrl: "https://unsplash.com/@pawel_czerwinski"
 * }
 * // Displayed as: "Photo by Pawel Czerwinski on Unsplash"
 * ```
 */
export interface UnsplashPhotographer {
    name: string
    username: string
    profileUrl: string
}

/**
 * Complete background image data structure from Unsplash API.
 * Contains image URLs, metadata, photographer attribution, and caching information
 * for daily background images displayed in the application.
 *
 * **Daily Refresh Mechanism:**
 * - Images update once per day based on `fetchDate`
 * - Lazy update: checks date on load, fetches if stale
 * - Manual refresh available via Settings
 * - Cached in localStorage to minimize API calls
 *
 * **Image Topics:**
 * Randomly selected from: abstract, nature, city, architecture, landscape
 *
 * **Storage:**
 * - **Key:** 'unsplash_background' in localStorage
 * - **Format:** JSON stringified UnsplashBackground
 * - **Persistence:** Survives page reloads and browser sessions
 *
 * @property id - Unique Unsplash photo identifier
 *   - Format: Alphanumeric string (e.g., "abc123XYZ")
 *   - Used for tracking and deduplication
 *   - Extracted from Unsplash API response.id
 *
 * @property url - Regular quality image URL for display
 *   - Resolution: ~1080px width (good quality, reasonable file size)
 *   - Extracted from Unsplash API response.urls.regular
 *   - Primary URL used for background display
 *   - Balance between quality and loading performance
 *
 * @property fullUrl - Full resolution image URL
 *   - Resolution: Original full size (highest quality available)
 *   - Extracted from Unsplash API response.urls.full
 *   - Available for high-DPI displays or download
 *   - Larger file size, use sparingly
 *
 * @property thumbUrl - Thumbnail/preview image URL
 *   - Resolution: Small size for quick loading
 *   - Extracted from Unsplash API response.urls.small
 *   - Can be used for preload or placeholder
 *   - Fastest to load
 *
 * @property blurHash - BlurHash string for placeholder while loading
 *   - Format: Compact string representation of image (e.g., "LEHV6nWB2yk8pyo0adR*.7kCMdnj")
 *   - Decoded to blurred image preview
 *   - Improves perceived loading performance
 *   - Shown before actual image loads
 *
 * @property color - Dominant/average color of the image
 *   - Format: Hex color code (e.g., "#6E633A")
 *   - Used as background placeholder color
 *   - Extracted from Unsplash API color analysis
 *   - Applied before image loads for smooth transition
 *
 * @property description - Image description or alt text (optional)
 *   - Source: Photographer-provided description or AI-generated alt text
 *   - Null if neither is available
 *   - Used for accessibility and context
 *   - Extracted from Unsplash API description or alt_description
 *
 * @property photographer - Attribution data for image creator
 *   - Required by Unsplash API Terms of Service
 *   - Contains name, username, and profile URL
 *   - Displayed in attribution UI with clickable link
 *
 * @property unsplashUrl - Link to photo page on Unsplash
 *   - Format: `https://unsplash.com/photos/{photo-id}`
 *   - Extracted from Unsplash API response.links.html
 *   - Opens photo detail page on Unsplash
 *   - Includes UTM tracking for Unsplash analytics
 *
 * @property downloadLocation - API endpoint for download tracking
 *   - Format: Unsplash API download endpoint URL
 *   - Extracted from Unsplash API response.links.download_location
 *   - Must be called when image is displayed (API requirement)
 *   - Increments download count for photographer analytics
 *   - Fire-and-forget request (non-critical)
 *
 * @property fetchDate - Date when image was fetched from API
 *   - Format: ISO 8601 date string "YYYY-MM-DD" (e.g., "2024-01-15")
 *   - Set by: getTodayDate() during fetch
 *   - Used for: Daily refresh validation (compare to current date)
 *   - Cache considered stale if fetchDate !== today
 *
 * @property topic - Search topic used to fetch this image
 *   - Values: "abstract", "nature", "city", "architecture", "landscape"
 *   - Randomly selected during fetch (unless manually specified)
 *   - Stored for reference and debugging
 *   - Allows users to know what type of image they're viewing
 *
 * @property stale - Optional flag indicating cache is outdated (optional)
 *   - True when: API key missing but returning cached data, OR fetch failed with fallback
 *   - False/undefined: Fresh data from successful fetch
 *   - Used to: Show warning or refresh prompt in UI
 *   - Not persisted to localStorage (computed at runtime)
 *
 * **Data Flow:**
 * 1. **Load:** loadCachedBackground() reads from localStorage
 * 2. **Check:** Compare fetchDate to today's date
 * 3. **Fetch:** If stale, getBackground() fetches fresh image from Unsplash API
 * 4. **Track:** triggerDownloadTracking() notifies Unsplash (required)
 * 5. **Save:** saveBackground() persists to localStorage
 * 6. **Display:** Background UI applies image with attribution
 *
 * **Fallback Behavior:**
 * - If API key missing and cache exists → return cached with `stale: true`
 * - If fetch fails and cache exists → return cached with `stale: true`
 * - If no cache and no API key → throw error
 *
 * **API Compliance:**
 * - Attribution must be displayed (photographer name + link)
 * - Download tracking must be triggered when image is shown
 * - UTM parameters included in links for Unsplash analytics
 *
 * @see UnsplashPhotographer for photographer attribution structure
 * @see getBackground() for fetch and cache logic
 * @see loadCachedBackground() for loading from localStorage
 * @see forceRefreshBackground() for manual refresh
 * @see unsplash-api.ts for complete API integration
 *
 * @example
 * ```ts
 * const background: UnsplashBackground = {
 *   id: "abc123XYZ",
 *   url: "https://images.unsplash.com/photo-123?w=1080",
 *   fullUrl: "https://images.unsplash.com/photo-123",
 *   thumbUrl: "https://images.unsplash.com/photo-123?w=400",
 *   blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
 *   color: "#6E633A",
 *   description: "Abstract colorful background",
 *   photographer: {
 *     name: "Pawel Czerwinski",
 *     username: "pawel_czerwinski",
 *     profileUrl: "https://unsplash.com/@pawel_czerwinski"
 *   },
 *   unsplashUrl: "https://unsplash.com/photos/abc123XYZ",
 *   downloadLocation: "https://api.unsplash.com/photos/abc123XYZ/download",
 *   fetchDate: "2024-01-15",
 *   topic: "abstract"
 *   // stale: true  // Only set when returning outdated cache
 * }
 * ```
 */
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

/**
 * Text position tracking for date/time matches in natural language parsing.
 * Represents the character indices where a date or time expression was found in the input text.
 * Used to highlight parsed dates in the AddTask input field and to strip matched text from content.
 *
 * **Position Semantics:**
 * - Uses zero-based indexing (like String.slice)
 * - `start` is inclusive, `end` is exclusive: `text.slice(start, end)`
 * - Empty match has `start === end`
 *
 * **Usage Context:**
 * - **Highlighting:** AddTask.svelte highlights text between start/end indices in real-time
 * - **Stripping:** stripDateMatch() removes the matched portion from task content
 * - **Scoring:** selectBest() uses position to choose between overlapping matches
 * - **Bridging:** findAdjacentTime() checks gaps between date and time matches
 *
 * **Examples:**
 * ```ts
 * // Input: "Buy milk tomorrow at 3pm"
 * // Date match: "tomorrow"
 * { start: 9, end: 17 }  // "tomorrow"
 * // Time match: "3pm"
 * { start: 21, end: 24 }  // "3pm"
 * // Combined match spans both:
 * { start: 9, end: 24 }   // "tomorrow at 3pm"
 * ```
 *
 * @property start - Zero-based index where match begins (inclusive)
 * @property end - Zero-based index where match ends (exclusive)
 *
 * @see ParsedDate for the final parsed result with match position
 * @see DateCandidate for internal candidate with match position
 * @see TimeMatch for time expressions with match position
 * @see stripDateMatch() for removing matched text from content
 * @see AddTask.svelte for real-time highlighting implementation
 */
export interface DateMatchPosition {
    start: number
    end: number
}

/**
 * Time expression match found during natural language date parsing.
 * Represents a parsed time with optional AM/PM indicator and text position.
 * Used internally by the date-matcher to combine times with dates.
 *
 * **Time Format Support:**
 * - **AM/PM times:** "3pm", "10:30 am", "2:15p" → `ampm: 'am' | 'pm'`
 * - **24-hour times:** "14:30", "09:00" → `ampm: null`
 * - **Bare hours:** "5", "14" → `ampm: null, requiresDate: true`
 *
 * **Hour Interpretation:**
 * When `ampm` is provided:
 * - Hour is 12-hour format (1-12, not 0-11)
 * - Converted to 24-hour during `applyTime()`: 3pm → 15, 12am → 0, 12pm → 12
 *
 * When `ampm` is null (24-hour time):
 * - Hour is already in 24-hour format (0-23)
 * - Used directly without conversion
 *
 * **Bare Hours (requiresDate flag):**
 * Bare numeric hours like "5" or "14" are ambiguous without context:
 * - `requiresDate: true` marks them as needing a date to be meaningful
 * - Only used when adjacent to a date expression (e.g., "tomorrow 5")
 * - Filtered out by parseSmartDate() if not combined with a date
 *
 * **Combining with Dates:**
 * - **findAdjacentTime()** finds time matches near date matches
 * - **combineDateAndTime()** merges time into date candidate
 * - If time was in the past today and no explicit date → bump to tomorrow
 * - Combined match position spans both date and time (min start, max end)
 *
 * @property start - Zero-based index where time match begins
 * @property end - Zero-based index where time match ends
 * @property hour - Hour component (12-hour format if ampm set, 24-hour if null)
 * @property minute - Minute component (0-59)
 * @property ampm - AM/PM indicator ('am', 'pm') or null for 24-hour times
 * @property requiresDate - Optional flag indicating time needs date context (bare hours only)
 *
 * **Detection Functions:**
 * - `findTimeWithAmPm()` - Detects "3pm", "10:30 am", "2:15p"
 * - `findTime24h()` - Detects "14:30", "09:00"
 * - `findBareHours()` - Detects "5", "14" (sets requiresDate: true)
 *
 * @see DateCandidate for the date candidate that receives the time
 * @see DateMatchPosition for text position structure
 * @see combineDateAndTime() for merging logic
 * @see findAdjacentTime() for finding nearby times
 * @see applyTime() for hour conversion and application
 * @see time-finders.ts for time detection implementation
 *
 * @example
 * ```ts
 * // AM/PM time: "Buy milk at 3pm"
 * const timeMatch: TimeMatch = {
 *   start: 14,
 *   end: 17,
 *   hour: 3,           // 12-hour format
 *   minute: 0,
 *   ampm: 'pm'         // Converted to 15:00 during applyTime()
 * }
 *
 * // 24-hour time: "Meeting at 14:30"
 * const time24h: TimeMatch = {
 *   start: 11,
 *   end: 16,
 *   hour: 14,          // Already 24-hour format
 *   minute: 30,
 *   ampm: null         // No conversion needed
 * }
 *
 * // Bare hour (requires date): "tomorrow 5"
 * const bareHour: TimeMatch = {
 *   start: 9,
 *   end: 10,
 *   hour: 5,
 *   minute: 0,
 *   ampm: null,
 *   requiresDate: true // Only used when adjacent to "tomorrow"
 * }
 * ```
 */
export interface TimeMatch {
    start: number
    end: number
    hour: number
    minute: number
    ampm: 'am' | 'pm' | null
    requiresDate?: boolean
}

/**
 * Candidate date match during natural language parsing.
 * Represents a potential date interpretation collected by date-finder functions.
 * Multiple candidates compete via scoring to select the best match.
 *
 * **Candidate Collection Flow:**
 * 1. **Detection:** Date-finder functions identify date expressions in text
 * 2. **Creation:** Each finder creates DateCandidate objects via `consider()` callback
 * 3. **Time Enhancement:** Candidates enriched with adjacent time matches via combineDateAndTime()
 * 4. **Scoring:** selectBest() evaluates all candidates and picks winner
 * 5. **Return:** Best candidate converted to ParsedDate for public API
 *
 * **Date Finder Functions:**
 * - `findRelativeDates()` - "today", "tomorrow", "yesterday"
 * - `findWeekdays()` - "monday", "next friday", "weekend"
 * - `findMonthDates()` - "january 15", "15 march", "jan 1st 2024"
 * - `findNumericDates()` - "12/31", "1-15-2024"
 * - `findOrdinalsOnly()` - "15th", "1st"
 * - Standalone times (when no date provided) - "3pm", "14:30"
 *
 * **Properties:**
 * @property date - Parsed Date object representing the candidate (mutable, in local timezone)
 * @property match - Text position where this date was found
 * @property hasTime - Whether candidate includes specific time (true) or is date-only (false)
 * @property dateProvided - Whether user explicitly wrote a date (true) or time-only (false)
 *
 * **dateProvided Flag:**
 * Distinguishes between explicit dates and inferred dates:
 * - `true`: User wrote a date ("tomorrow", "jan 15", "12/31")
 * - `false`: Time-only input ("3pm", "14:30") → date inferred as today/tomorrow
 *
 * **Past Time Handling:**
 * When `dateProvided: false` and time has passed today:
 * - Automatically bump to tomorrow (e.g., "3pm" at 5pm → tomorrow 3pm)
 * - Applied in combineDateAndTime() and standalone time detection
 *
 * **Scoring Criteria:**
 * selectBest() evaluates candidates on:
 * - **dateProvided:** Explicit dates preferred over inferred dates
 * - **Match length:** Longer matches preferred (more specific)
 * - **Match position:** Earlier matches preferred (left-to-right reading)
 *
 * **Internal vs Public:**
 * - **DateCandidate** is internal (used during parsing only)
 * - **ParsedDate** is public (returned from parseSmartDate())
 * - Conversion happens after scoring: Date → ISO string, same match/hasTime
 *
 * @see ParsedDate for the public API result type
 * @see DateMatchPosition for match position structure
 * @see TimeMatch for time expressions that enhance candidates
 * @see selectBest() for scoring and selection logic
 * @see combineDateAndTime() for adding time to candidates
 * @see date-finders.ts for candidate creation functions
 * @see parseSmartDate() for the complete parsing workflow
 *
 * @example
 * ```ts
 * // Explicit date from "tomorrow"
 * const candidate1: DateCandidate = {
 *   date: new Date(2024, 0, 16),  // January 16, 2024
 *   match: { start: 9, end: 17 },
 *   hasTime: false,
 *   dateProvided: true             // User explicitly wrote "tomorrow"
 * }
 *
 * // Time-only "3pm" → inferred date
 * const candidate2: DateCandidate = {
 *   date: new Date(2024, 0, 15, 15, 0, 0),  // Today 3pm (or tomorrow if past)
 *   match: { start: 0, end: 3 },
 *   hasTime: true,
 *   dateProvided: false            // No explicit date, inferred from time
 * }
 *
 * // Combined "tomorrow at 3pm"
 * const candidate3: DateCandidate = {
 *   date: new Date(2024, 0, 16, 15, 0, 0),
 *   match: { start: 0, end: 16 },  // Spans both date and time
 *   hasTime: true,
 *   dateProvided: true             // User provided date "tomorrow"
 * }
 * ```
 */
export interface DateCandidate {
    date: Date
    match: DateMatchPosition
    hasTime: boolean
    dateProvided: boolean
}

/**
 * Final parsed date result returned by parseSmartDate().
 * Contains ISO-formatted date string, text match position, and time presence flag.
 * This is the public API result consumed by AddTask.svelte for task creation.
 *
 * **Natural Language Support:**
 * Parses a wide variety of date/time expressions:
 *
 * **Relative dates:**
 * - "today", "tomorrow", "tmrw", "yesterday"
 *
 * **Weekdays:**
 * - "monday", "next friday", "mon", "weekend", "next weekend"
 *
 * **Month formats:**
 * - "january 15", "jan 15th", "15 january", "jan 1st 2024"
 *
 * **Numeric dates:**
 * - "12/31", "1-15-2024" (respects dateFormat setting: mdy vs dmy)
 *
 * **Times:**
 * - "3pm", "10:30 am", "2:15p" (AM/PM)
 * - "14:30", "09:00" (24-hour)
 * - Bare hours when adjacent to date: "tomorrow 5"
 *
 * **Combined date + time:**
 * - "tomorrow at 3pm", "jan 15 14:30", "next monday 9am"
 *
 * **Date Format:**
 * @property date - ISO 8601 date string in one of two formats:
 *   - Date only: `"YYYY-MM-DD"` (e.g., "2024-01-15") when `hasTime: false`
 *   - Date with time: `"YYYY-MM-DDTHH:mm:ss"` (e.g., "2024-01-15T14:30:00") when `hasTime: true`
 *
 * The format matches TaskDue.date structure used by task providers.
 *
 * **Match Position:**
 * @property match - Text position of the parsed date/time expression
 *   - Used by AddTask.svelte to highlight the parsed text in real-time
 *   - Used by stripDateMatch() to remove parsed date from task content
 *   - Spans entire expression for combined matches (e.g., "tomorrow at 3pm")
 *
 * **Time Presence:**
 * @property hasTime - Whether the parsed date includes specific time
 *   - `true`: Date includes time (format: YYYY-MM-DDTHH:mm:ss)
 *   - `false`: Date only (format: YYYY-MM-DD, represents end of day)
 *
 * **Usage Flow:**
 * 1. **Input:** User types in AddTask.svelte: "Buy milk tomorrow at 3pm"
 * 2. **Parse:** parseSmartDate() returns ParsedDate
 * 3. **Highlight:** AddTask highlights "tomorrow at 3pm" using match.start/end
 * 4. **Submit:** Task created with:
 *    - content: "Buy milk" (date stripped via stripDateMatch)
 *    - due.date: "2024-01-16T15:00:00" (from ParsedDate.date)
 *
 * **Null Return:**
 * parseSmartDate() returns `null` when:
 * - No date/time expression found in input
 * - Input is empty or whitespace-only
 * - Parsing failed (malformed date, etc.)
 *
 * **Internal Workflow:**
 * 1. Collect DateCandidate objects from all date/time finders
 * 2. Score candidates via selectBest()
 * 3. Convert best candidate to ParsedDate:
 *    - Date object → ISO string (preserves hasTime)
 *    - Keep match position and hasTime flag
 * 4. Return to caller
 *
 * @see parseSmartDate() for the parsing function that returns this type
 * @see DateCandidate for the internal candidate type
 * @see DateMatchPosition for match position structure
 * @see stripDateMatch() for removing matched text
 * @see formatTaskDue() for converting Date back to this format
 * @see AddTask.svelte for real-time parsing and highlighting
 * @see TaskDue for the task due date structure
 *
 * @example
 * ```ts
 * // Parse "Buy milk tomorrow at 3pm"
 * const result: ParsedDate | null = parseSmartDate("Buy milk tomorrow at 3pm")
 *
 * // Result:
 * {
 *   date: "2024-01-16T15:00:00",  // ISO format with time
 *   match: { start: 9, end: 25 }, // "tomorrow at 3pm"
 *   hasTime: true                  // Includes specific time
 * }
 *
 * // Parse "Call doctor next monday"
 * const result2 = parseSmartDate("Call doctor next monday")
 * // Result:
 * {
 *   date: "2024-01-22",           // ISO format date-only
 *   match: { start: 12, end: 23 }, // "next monday"
 *   hasTime: false                 // No specific time
 * }
 *
 * // No match: returns null
 * const result3 = parseSmartDate("Buy milk")  // null
 * ```
 */
export interface ParsedDate {
    date: string
    match: DateMatchPosition
    hasTime: boolean
}

/**
 * Formatting options for date display in the UI.
 * Configures how dates and times are formatted in relative date strings and forecast displays.
 * Passed to formatting functions to respect user's time format preference.
 *
 * **Primary Use Cases:**
 * 1. **Task due dates:** formatRelativeDate() formats task due dates with user's time preference
 * 2. **Weather forecast:** WeatherAPI._formatTime() formats forecast times
 * 3. **Calendar events:** Time display in Calendar.svelte
 *
 * **Time Format Effects:**
 * @property timeFormat - User's preferred time display format
 *   - `'12hr'`: 12-hour format with AM/PM (e.g., "3:30 pm", "11:00 am")
 *   - `'24hr'`: 24-hour format (e.g., "15:30", "23:00")
 *
 * **Example Outputs:**
 *
 * **formatRelativeDate() with time:**
 * ```ts
 * // Date: Tomorrow 3:30 PM
 * formatRelativeDate(date, true, { timeFormat: '12hr' })  // "tmrw 3:30 pm"
 * formatRelativeDate(date, true, { timeFormat: '24hr' })  // "tmrw 15:30"
 * ```
 *
 * **Weather forecast formatting:**
 * ```ts
 * // Forecast hour: 17:00
 * // 12hr format: "5pm"
 * // 24hr format: "17:00"
 * ```
 *
 * **Relative Date Formats (without time):**
 * - -1 day: "yesterday"
 * - Today: "today"
 * - +1 day: "tmrw"
 * - +2 to +6 days: Weekday abbreviation (e.g., "mon", "fri")
 * - +7+ days: Month + day (e.g., "jan 15")
 *
 * **Settings Integration:**
 * - Sourced from settings.timeFormat (managed by settings-store.svelte.ts)
 * - User configures in Settings → Clock section
 * - Persisted to localStorage
 * - Applied reactively across all date/time displays
 *
 * **Why Not Use Full Settings Object:**
 * FormatOptions is intentionally minimal:
 * - Avoids coupling formatting functions to entire Settings structure
 * - Enables testing with simple options object
 * - Only includes options relevant to date formatting
 * - Can be extended with dateFormat, locale, etc. if needed
 *
 * **Future Extensibility:**
 * Could be extended with additional formatting options:
 * - `dateFormat?: DateFormat` - mdy vs dmy ordering
 * - `locale?: string` - Localization support
 * - `timezone?: string` - Timezone conversion
 *
 * @see formatRelativeDate() for task due date formatting
 * @see WeatherAPI._formatTime() for weather forecast time formatting
 * @see TimeFormat for the type definition ('12hr' | '24hr')
 * @see Settings.timeFormat for where this value comes from
 * @see date-formatter.ts for formatting implementation
 *
 * @example
 * ```ts
 * // From user settings
 * const options: FormatOptions = {
 *   timeFormat: settings.timeFormat  // '12hr' or '24hr'
 * }
 *
 * // Format task due date
 * const formatted = formatRelativeDate(task.due_date, task.has_time, options)
 * // Examples:
 * // "today 3:30 pm" (12hr)
 * // "today 15:30" (24hr)
 * // "tmrw" (no time)
 * // "fri 2:00 pm" (12hr, this friday)
 * // "jan 15 14:00" (24hr, future date)
 * ```
 */
export interface FormatOptions {
    timeFormat: TimeFormat
}

// Provider config types

/**
 * Configuration options for task provider backends.
 * Passed to createTaskProvider() factory function to instantiate task providers
 * with the necessary credentials and settings.
 *
 * **Supported Providers:**
 * - **LocalStorageProvider:** No configuration needed (apiToken ignored)
 * - **TodoistProvider:** Requires `apiToken` for Todoist Sync API v1
 * - **GoogleTasksProvider:** Uses Google OAuth (apiToken not used)
 *
 * **Configuration Properties:**
 * @property apiToken - Optional API authentication token
 *   - **Todoist:** Required - Todoist API token from user settings
 *     - Source: settings.todoistApiToken
 *     - Used for: Todoist Sync API v1 authentication
 *     - Format: Bearer token string (e.g., "abc123...")
 *     - Validation: Provider throws AuthError if missing or invalid
 *   - **Local Storage:** Not used (localStorage needs no authentication)
 *   - **Google Tasks:** Not used (OAuth handled by google-auth module)
 *
 * **Factory Usage:**
 * ```ts
 * // Todoist provider with API token
 * const todoistProvider = createTaskProvider('todoist', {
 *   apiToken: settings.todoistApiToken
 * })
 *
 * // LocalStorage provider (no config needed)
 * const localProvider = createTaskProvider('local', {})
 *
 * // Google Tasks provider (OAuth handled separately)
 * const googleProvider = createTaskProvider('google-tasks', {})
 * ```
 *
 * **Settings Integration:**
 * - Configuration derived from Settings object in settings-store.svelte.ts
 * - apiToken sourced from settings.todoistApiToken
 * - Provider type determined by settings.taskBackend
 * - Tasks.svelte instantiates provider using createTaskProvider()
 *
 * **Future Extensibility:**
 * This interface can be extended with additional provider-specific options:
 * - `syncInterval?: number` - Auto-sync frequency in milliseconds
 * - `offlineMode?: boolean` - Enable offline-first caching
 * - `projectFilter?: string[]` - Filter tasks by project IDs
 * - `labelFilter?: string[]` - Filter tasks by label IDs
 *
 * @see createTaskProvider() for factory function that uses this config
 * @see TaskProvider for the base provider class that receives config
 * @see Settings.todoistApiToken for Todoist API token storage
 * @see Settings.taskBackend for provider type selection
 * @see Tasks.svelte for provider instantiation
 *
 * @example
 * ```ts
 * // Typical usage in Tasks.svelte
 * const config: TaskProviderConfig = {
 *   apiToken: settings.todoistApiToken  // Only used by Todoist
 * }
 *
 * const provider = createTaskProvider(
 *   settings.taskBackend,  // 'local' | 'todoist' | 'google-tasks'
 *   config
 * )
 *
 * // Provider uses config internally:
 * // - TodoistProvider: this.token = config.apiToken || ''
 * // - LocalStorageProvider: config ignored
 * // - GoogleTasksProvider: config ignored (uses OAuth)
 * ```
 */
export interface TaskProviderConfig {
    apiToken?: string
}

/**
 * Configuration options for calendar provider backends.
 * Currently empty but designed for future extensibility as calendar integrations expand.
 * Passed to createCalendarProvider() factory function (currently takes no arguments).
 *
 * **Current Implementation:**
 * - **GoogleCalendarProvider:** Only calendar provider, no configuration needed
 *   - OAuth handled by google-auth module (shared with Google Tasks)
 *   - Calendar selection managed via settings.selectedCalendars
 *   - No provider-specific configuration required
 *
 * **Factory Usage:**
 * ```ts
 * // Current usage (no config needed)
 * const calendarProvider = createCalendarProvider()
 * ```
 *
 * **Future Extensibility:**
 * As additional calendar integrations are added, this interface can be extended with:
 *
 * **Potential Future Properties:**
 * - `apiToken?: string` - API authentication for third-party calendar services
 * - `syncInterval?: number` - Auto-refresh frequency in milliseconds
 * - `eventFilter?: object` - Filter criteria (e.g., event types, calendars)
 * - `timezone?: string` - Override timezone for event display
 * - `cacheStrategy?: 'aggressive' | 'normal' | 'minimal'` - Caching behavior
 *
 * **Potential Future Providers:**
 * - **OutlookCalendarProvider:** Microsoft calendar integration
 *   - Would need: `{ apiToken: outlookToken }`
 * - **AppleCalendarProvider:** iCloud calendar integration
 *   - Would need: `{ apiToken: appleToken }`
 * - **CalDAVProvider:** Generic CalDAV server support
 *   - Would need: `{ serverUrl: string, username: string, password: string }`
 *
 * **Settings Integration:**
 * - Calendar selection: settings.selectedCalendars (array of calendar IDs)
 * - OAuth state: settings.googleTasksSignedIn (shared with Google Tasks)
 * - Visibility: settings.showCalendar (toggle calendar widget)
 *
 * **Example Future Usage:**
 * ```ts
 * // Hypothetical future usage with multiple providers
 * interface CalendarProviderConfig {
 *   provider?: 'google' | 'outlook' | 'apple'  // Provider type
 *   apiToken?: string                           // For non-OAuth providers
 *   syncInterval?: number                       // Auto-refresh frequency
 * }
 *
 * const config: CalendarProviderConfig = {
 *   provider: 'outlook',
 *   apiToken: settings.outlookToken,
 *   syncInterval: 300000  // 5 minutes
 * }
 *
 * const calendarProvider = createCalendarProvider(config)
 * ```
 *
 * **Current Implementation Note:**
 * While this interface exists for consistency with TaskProviderConfig,
 * createCalendarProvider() currently takes no arguments and always returns
 * GoogleCalendarProvider. The config interface serves as a placeholder for
 * when multiple calendar backends are supported.
 *
 * @see createCalendarProvider() for factory function (currently parameterless)
 * @see GoogleCalendarProvider for the current calendar provider implementation
 * @see Settings.selectedCalendars for calendar selection configuration
 * @see Settings.googleTasksSignedIn for OAuth state
 * @see Calendar.svelte for calendar provider usage
 *
 * @example
 * ```ts
 * // Current usage (config not used yet)
 * const provider = createCalendarProvider()
 * const events = await provider.getEvents()
 *
 * // Future usage (when config is implemented)
 * const config: CalendarProviderConfig = {
 *   // Future configuration options will go here
 * }
 * const provider = createCalendarProvider(config)
 * ```
 */
export interface CalendarProviderConfig {
    // Empty config for now, can be extended in the future
}

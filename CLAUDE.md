# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

re-start is a TUI-style browser startpage extension built with Svelte 5. It features task management (local, Todoist, Google Tasks), Google Calendar integration, weather display, customizable quick links, and multiple color themes. The extension targets both Firefox and Chrome.

## Commands

```bash
npm run dev            # Run dev server at localhost:5173
npm run build:firefox  # Build for Firefox → dist/firefox
npm run build:chrome   # Build for Chrome → dist/chrome
npm run watch          # Build + watch for Firefox (use with web-ext run)
npm test               # Run vitest tests
```

## Project Structure

```
src/
├── main.js                      # Entry point - mounts App.svelte
├── App.svelte                   # Root component with layout and settings modal
├── app.css                      # Global styles
├── assets/
│   └── descriptions.json        # Weather code descriptions
└── lib/
    ├── backends/                # Task/calendar backend implementations
    │   ├── index.js             # Factory functions (createTaskBackend, createCalendarBackend)
    │   ├── task-backend.js      # Abstract base class
    │   ├── localstorage-backend.js
    │   ├── todoist-backend.js
    │   ├── google-tasks-backend.js
    │   ├── google-calendar-backend.js
    │   └── google-auth.js       # Shared Google OAuth logic
    ├── components/              # Svelte components
    │   ├── Clock.svelte         # Time/date display with 12/24hr format
    │   ├── Weather.svelte       # Weather with 5-hour forecast
    │   ├── Tasks.svelte         # Multi-backend task management
    │   ├── AddTask.svelte       # Task input with date highlighting
    │   ├── Calendar.svelte      # Google Calendar events
    │   ├── Links.svelte         # Quick link grid with drag reorder
    │   ├── Settings.svelte      # Settings modal
    │   ├── Stats.svelte         # FPS/latency/viewport stats
    │   └── RadioButton.svelte   # Custom radio button
    ├── settings-store.svelte.js # State management with Svelte 5 runes
    ├── themes.js                # Theme definitions (10+ themes)
    ├── date-matcher.js          # Natural language date parser
    ├── weather-api.js           # OpenMeteo API wrapper
    └── tests/
        └── date-matcher.test.js
public/
├── manifest.json                # Extension manifest template
├── oauth-callback.html          # OAuth redirect handler
└── icon.svg
scripts/
└── build-manifest.js            # Browser-specific manifest generator
```

## Architecture

### Entry Point Flow
`src/main.js` → mounts `App.svelte` → renders widgets (Clock, Weather, Tasks, Calendar, Links, Stats) + Settings modal

### State Management
Uses Svelte 5 runes (`$state`, `$effect`, `$derived`) in `src/lib/settings-store.svelte.js`. Settings persist to localStorage and reactive effects in App.svelte handle theme/CSS/font updates.

Key settings structure:
- Display: `font`, `currentTheme`, `tabTitle`, `customCSS`
- Clock: `timeFormat` (12hr/24hr), `dateFormat` (mdy/dmy)
- Weather: `showWeather`, `locationMode`, `latitude`, `longitude`, `tempUnit`, `speedUnit`
- Tasks: `showTasks`, `taskBackend` (local/todoist/google-tasks), `todoistApiToken`
- Calendar: `showCalendar`, `googleTasksSignedIn`
- Links: `showLinks`, `linksPerColumn`, `linkTarget`, `links[]`

### Task Backend System
Abstract backend pattern in `src/lib/backends/`:
- `task-backend.js` - base class defining interface (sync, getTasks, addTask, completeTask, uncompleteTask, deleteTask)
- `localstorage-backend.js` - browser-only storage (localStorage is source of truth)
- `todoist-backend.js` - Todoist Sync API v1 with incremental sync tokens
- `google-tasks-backend.js` - Google Tasks API with shared OAuth

Factory functions in `src/lib/backends/index.js`:
- `createTaskBackend(type, config)` - instantiates task backend
- `createCalendarBackend()` - instantiates Google Calendar backend

### Google Calendar Backend
`google-calendar-backend.js` fetches today's events using Google Calendar API v3. Shares OAuth with Google Tasks.

### Google OAuth System
`src/lib/backends/google-auth.js` implements implicit flow with silent refresh:
- `signIn()` - popup-based OAuth (500×600px window)
- `refreshAccessToken()` - silent refresh via hidden iframe with `prompt=none`
- `ensureValidToken()` - auto-refresh with 5-minute buffer before expiry
- `getIsSignedIn()` - check if token exists and not expired
- `signOut()` - clear all tokens

OAuth scopes: `tasks`, `calendar.readonly`, `userinfo.email`
Redirect handled by `public/oauth-callback.html` (parses hash fragment, posts message to opener/parent)

### Weather API
`src/lib/weather-api.js` wraps OpenMeteo API (free, no key required):
- 24-hour forecast (5 forecasts, every 3 hours)
- Current conditions with apparent temperature
- 15-minute cache TTL with coordinate-based invalidation
- Weather codes mapped via `src/assets/descriptions.json`

### Theming
Themes defined in `src/lib/themes.js` as CSS variable maps. Includes: default, rose-pine, catppuccin-mocha, catppuccin-latte, nord, tokyo-night, gruvbox, everforest.

Theme data is injected at build time via `vite.config.js` plugin and applied before render via IIFE in `index.html` (prevents flash). Runtime updates via `document.documentElement.style.setProperty()`.

CSS variables: `--bg-1/2/3`, `--txt-1/2/3/4`, `--txt-err`, `--font-family`

### Smart Date Parsing
`src/lib/date-matcher.js` provides natural language date parsing for task input. Supports:
- Relative: `today`, `tomorrow`, `tmrw`, `yesterday`
- Weekdays: `monday`, `next friday`, `mon`
- Month formats: `january 15`, `jan 15th`, `15 january`
- Special: `weekend`, `next weekend`

Returns `{ match: {start, end}, due: 'YYYY-MM-DD', hasTime: boolean }`. Used by `AddTask.svelte` to highlight parsed dates in real-time.

### Build System
Vite with custom plugins in `vite.config.js`:
- `injectThemeScript()` - extracts theme colors and injects loader into HTML
- `excludeManifest()` - removes manifest.json (generated per-target by `scripts/build-manifest.js`)
- Version injected via `__APP_VERSION__` from manifest.json

## Key Patterns

- Components use document visibility API to pause updates when tab is hidden (Clock, Stats, Weather, Tasks)
- Weather/tasks sync on tab focus with localStorage caching
- Settings trigger reactive effects in App.svelte for theme/CSS/font changes
- `needsConfiguration` computed property shows pulsing settings button when required settings are missing
- Task sorting: unchecked first → by due date → by project → by order
- Recently completed tasks shown for 5 minutes before hiding
- Dynamic CSS injection via `<style id="custom-css">` element
- Link grid uses `$derived.by()` for responsive column layout

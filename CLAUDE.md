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
    ├── unsplash-api.js          # Daily background images from Unsplash
    └── tests/
        └── date-matcher.test.js
public/
├── manifest.json                # Extension manifest template
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
- Background: `showBackground`, `backgroundOpacity`
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
`src/lib/backends/google-auth.js` uses Google Identity Services (GIS) library:
- `signIn()` - requests access token via GIS popup
- `ensureValidToken()` - auto-refresh with 5-minute buffer before expiry
- `getIsSignedIn()` - check if token exists and not expired
- `signOut()` - revoke token and clear storage

OAuth scopes: `tasks`, `calendar.readonly`, `userinfo.email`
GIS library loaded dynamically from `https://accounts.google.com/gsi/client`

### Unsplash Background
`src/lib/unsplash-api.js` provides daily background images:
- Fetches random images from topics: abstract, nature, city, architecture, landscape
- Daily auto-refresh with lazy update (checks date on load)
- Force refresh via Settings
- Caches image data and photographer attribution in localStorage

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

### Development & Production Architecture

The app runs as a web app (not just browser extension) with a Node.js backend for Google OAuth.

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Browser (:5173)     Vite Dev Server        Node Backend       │
│   ┌──────────┐        ┌──────────────┐       ┌──────────────┐   │
│   │          │───────▶│   Frontend   │       │              │   │
│   │  User    │        │   (HMR)      │       │  /api/auth/* │   │
│   │          │───────▶│──────────────│──────▶│  OAuth flow  │   │
│   └──────────┘        │ Proxy /api/* │       │              │   │
│                       │ → :3004      │       │  Port 3004   │   │
│                       └──────────────┘       └──────────────┘   │
│                          Port 5173                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Browser             Node Backend (single server)              │
│   ┌──────────┐        ┌─────────────────────────────────┐       │
│   │          │───────▶│  Static files (backend/public/) │       │
│   │  User    │        │  ├── index.html                 │       │
│   │          │───────▶│  ├── assets/*                   │       │
│   └──────────┘        │  └── ...                        │       │
│                       │                                 │       │
│                       │  /api/auth/* → OAuth flow       │       │
│                       │  /* → SPA fallback (index.html) │       │
│                       └─────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Development Setup:**
```bash
# Terminal 1 - Backend (OAuth API)
cd backend && node server.js    # Runs on :3004

# Terminal 2 - Frontend (Vite dev server)
npm run dev                      # Runs on :5173, proxies /api/* to :3004
```
Open `http://localhost:5173`. Vite proxies `/api/*` requests to the backend (configured in `vite.config.js`).

**Production Setup:**
The Node backend serves everything:
- Static frontend files from `backend/public/`
- OAuth API routes at `/api/auth/*`
- SPA fallback for client-side routing

**Deployment Flow (GitHub Actions):**
```yaml
# .github/workflows/deploy.yml
1. npm ci && npm run build          # Build frontend → dist/firefox/
2. cp -r dist/firefox backend/public # Copy to backend static folder
3. rsync backend/ → server          # Deploy backend (with frontend inside)
4. docker compose up -d --build     # Restart container
```

**Key Files:**
- `vite.config.js` - Dev proxy: `/api` → `http://localhost:3004`
- `src/lib/backends/google-auth.js` - Uses relative `/api/auth/*` paths (works in both dev/prod)
- `backend/server.js` - Express server serving static files + OAuth routes
- `.github/workflows/deploy.yml` - Copies frontend build to backend before deploy

## Code Navigation with Serena (REQUIRED)

**IMPORTANT: Always use Serena's MCP tools (`mcp__serena__*`) for code exploration and editing instead of Read/Grep/Glob tools.**

### When to use Serena tools (ALWAYS for code files):
- Understanding a file → `mcp__serena__get_symbols_overview`
- Finding a function/class/method → `mcp__serena__find_symbol`
- Finding usages/references → `mcp__serena__find_referencing_symbols`
- Searching code patterns → `mcp__serena__search_for_pattern`
- Editing symbols → `mcp__serena__replace_symbol_body`, `mcp__serena__insert_after_symbol`, `mcp__serena__insert_before_symbol`
- Renaming across codebase → `mcp__serena__rename_symbol`

### When to use standard tools (non-code files only):
- Reading config files (JSON, YAML, etc.)
- Reading markdown/documentation
- Reading non-code assets

### Workflow example:
```
# 1. Understand file structure (NOT Read tool)
mcp__serena__get_symbols_overview("src/lib/backends/google-auth.js")

# 2. Find specific symbol with body
mcp__serena__find_symbol(name_path_pattern="signIn", include_body=True)

# 3. Find all usages
mcp__serena__find_referencing_symbols(name_path="signIn", relative_path="src/lib/backends/google-auth.js")

# 4. Edit a symbol
mcp__serena__replace_symbol_body(name_path="signIn", relative_path="...", body="new code")
```

### Key benefits:
- Token-efficient: reads only what's needed
- Semantic awareness: understands code structure
- Safe refactoring: rename across entire codebase

## Error Handling Patterns

### Error Types
All backends use typed error classes from `src/lib/errors.ts` for consistent error handling:

**Error Hierarchy:**
```typescript
BackendError (base class)
├── NetworkError      // Network failures, timeouts, offline
├── AuthError         // Authentication/authorization failures
├── RateLimitError    // API rate limiting
├── ValidationError   // Invalid input/response data
└── SyncError         // Synchronization failures
```

**Error Properties:**
- `code: BackendErrorCode` - Enum for programmatic error handling
- `originalError?: Error` - Wrapped original error for debugging
- `isRetryable: boolean` - Whether operation should be retried
- `userMessage: string` - User-friendly error message

**Factory Methods:**
Error classes provide static factory methods for common scenarios:
```typescript
NetworkError.fromResponse(response)  // From fetch Response
NetworkError.timeout()               // Timeout error
AuthError.invalidToken()             // Invalid token
AuthError.sessionExpired()           // Session expired
RateLimitError.fromHeader(header)    // From Retry-After header
ValidationError.parseError(err)      // JSON parse failure
SyncError.failed(err)                // Generic sync failure
```

### Logging Utility
Use the shared logger from `src/lib/logger.ts` for consistent logging:

```typescript
import { createLogger } from '../logger'

const logger = createLogger('BackendName')

logger.log('Info message:', { data })
logger.warn('Warning message')
logger.error('Error message:', error)
```

Output format: `[BackendName] message data`

### Error Handling in Backends

**Base Class Helpers:**
`TaskBackend` provides helper methods for consistent error handling:
- `wrapError(error, context, defaultType)` - Wraps unknown errors into typed BackendErrors
- `isRetryableError(error)` - Determines if error should be retried

**Best Practices:**
1. **Import error types and logger:**
   ```typescript
   import { createLogger } from '../logger'
   import { NetworkError, AuthError, SyncError } from '../errors'

   const logger = createLogger('MyBackend')
   ```

2. **Use specific error types when throwing:**
   ```typescript
   if (!response.ok) {
     if (response.status === 401) {
       throw AuthError.invalidToken()
     }
     if (response.status === 429) {
       throw RateLimitError.fromHeader(response.headers.get('Retry-After'))
     }
     throw NetworkError.fromResponse(response)
   }
   ```

3. **Wrap unknown errors in catch blocks:**
   ```typescript
   try {
     await this.apiCall()
   } catch (error) {
     logger.error('Sync failed:', error)
     throw this.wrapError(error, 'sync', SyncError)
   }
   ```

4. **Don't re-wrap BackendErrors:**
   ```typescript
   protected wrapError(error: unknown, context: string): BackendError {
     // If already a BackendError, return as-is
     if (error instanceof BackendError) {
       return error
     }
     // ... wrap other errors
   }
   ```

5. **Use isRetryableError for retry logic:**
   ```typescript
   catch (error) {
     if (this.isRetryableError(error) && !isRetry) {
       logger.log('Retrying after error:', error)
       return this.sync(resourceTypes, true)
     }
     throw this.wrapError(error, 'sync', SyncError)
   }
   ```

6. **Log before throwing:**
   ```typescript
   logger.error('Operation failed:', error)
   throw this.wrapError(error, 'operation', SyncError)
   ```

### Error Handling Examples

**TodoistBackend** - Retry logic with typed errors:
```typescript
catch (error) {
  if (this.isRetryableError(error) && !isRetry) {
    logger.warn('Sync failed, resetting token and retrying')
    this.syncToken = '*'
    return this.sync(resourceTypes, true)
  }
  logger.error('Sync failed:', error)
  throw this.wrapError(error, 'Todoist sync', SyncError)
}
```

**GoogleAuth** - Specific error types for auth flows:
```typescript
if (response.status === 401) {
  throw AuthError.invalidToken('API request unauthorized')
}
if (!response.ok) {
  throw NetworkError.fromResponse(response)
}
```

**WeatherAPI** - Validation errors for parsing:
```typescript
try {
  return JSON.parse(cached)
} catch (error) {
  logger.warn('Failed to parse cached data:', error)
  throw ValidationError.parseError('Invalid cached weather data', error)
}
```

**Error Codes:**
Use `BackendErrorCode` enum for programmatic error handling:
- Network: `NETWORK_ERROR`, `NETWORK_TIMEOUT`, `NETWORK_OFFLINE`
- Auth: `AUTH_INVALID_TOKEN`, `AUTH_TOKEN_EXPIRED`, `AUTH_UNAUTHORIZED`, `AUTH_REFRESH_FAILED`
- Rate limit: `RATE_LIMIT_EXCEEDED`
- Validation: `VALIDATION_INVALID_INPUT`, `VALIDATION_PARSE_ERROR`, `VALIDATION_INVALID_RESPONSE`
- Sync: `SYNC_FAILED`, `SYNC_CONFLICT`, `SYNC_PARTIAL_FAILURE`

## Key Patterns

- Components use document visibility API to pause updates when tab is hidden (Clock, Stats, Weather, Tasks)
- Weather/tasks sync on tab focus with localStorage caching
- Settings trigger reactive effects in App.svelte for theme/CSS/font changes
- `needsConfiguration` computed property shows pulsing settings button when required settings are missing
- Task sorting: unchecked first → by due date → by project → by order
- Recently completed tasks shown for 5 minutes before hiding
- Dynamic CSS injection via `<style id="custom-css">` element
- Link grid uses `$derived.by()` for responsive column layout
- Frosted glass effect on panels when background image is enabled (`body.has-background`)

# Codebase Refactoring Findings (2025-12-29)

## Issues Found and Fixed

### 1. Console.log statements in production ✅ FIXED
- `todoist-provider.ts`: Removed from `sync()` and `executeCommands()`
- `google-calendar-provider.ts`: Removed from `sync()`

### 2. Unused exports in google-auth.js ✅ FIXED
- `getIsSignedIn()`: Removed (was just an alias for `isSignedIn()`)
- `checkAuthStatus()`: Removed (never called anywhere)

### 3. Duplicate sortTasks() method ✅ FIXED
- Extracted to `TaskProvider.sortTasks()` in base class
- Removed from `LocalStorageProvider`, `TodoistProvider`, `GoogleTasksProvider`
- ~110 lines of duplicate code removed

## Issues Found - Not Yet Fixed

### 4. Duplicate apiRequest() method
- GoogleTasksBackend and GoogleCalendarBackend have identical implementations
- Consider extracting to shared utility or keeping as-is (uses `this.baseUrl`)

### 5. Magic number `5 * 60 * 1000` (5 minutes)
- Used in multiple places for cache expiry and recent task threshold
- Consider extracting to a constant `FIVE_MINUTES_MS`
- Files: google-tasks-provider.ts, google-calendar-provider.ts, todoist-provider.ts, localstorage-provider.ts

### 6. Promise.resolve() returns ✅ FIXED
- `localstorage-provider.ts`: Removed unnecessary `return Promise.resolve()` from 5 async methods
- async functions already return promises implicitly

## Notes
- `apiRequest` duplication intentionally kept since methods use class-specific `this.baseUrl`
- Theme fallback bug was previously fixed: `themes['defaultTheme']` → `themes['default']`

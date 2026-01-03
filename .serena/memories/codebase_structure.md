# Codebase Structure

```
re-start/
├── src/
│   ├── main.js                      # Entry point - mounts App.svelte
│   ├── App.svelte                   # Root component (layout + settings modal)
│   ├── app.css                      # Global styles
│   ├── assets/
│   │   └── descriptions.json        # Weather code descriptions
│   └── lib/
│       ├── providers/               # Task/calendar provider implementations
│       │   ├── index.ts             # Factory functions
│       │   ├── task-provider.ts     # Abstract base class
│       │   ├── localstorage-provider.ts
│       │   ├── todoist-provider.ts
│       │   ├── google-tasks-provider.ts
│       │   ├── google-calendar-provider.ts
│       │   └── google-auth/         # Shared Google OAuth
│       ├── components/              # Svelte components
│       │   ├── Clock.svelte
│       │   ├── Weather.svelte
│       │   ├── Tasks.svelte
│       │   ├── AddTask.svelte
│       │   ├── Calendar.svelte
│       │   ├── Links.svelte
│       │   ├── Settings.svelte
│       │   ├── Stats.svelte
│       │   └── RadioButton.svelte
│       ├── settings-store.svelte.js # Svelte 5 runes state management
│       ├── themes.js                # Theme definitions
│       ├── date-matcher.js          # Natural language date parser
│       ├── weather-api.js           # OpenMeteo API wrapper
│       ├── unsplash-api.js          # Daily background images
│       └── tests/
│           └── date-matcher.test.js
├── public/
│   ├── manifest.json                # Extension manifest template
│   └── icon.svg
├── scripts/
│   └── build-manifest.js            # Browser-specific manifest generator
├── backend/                         # (additional backend code)
├── dist/                            # Build output
│   ├── firefox/
│   └── chrome/
├── index.html                       # HTML entry point
├── vite.config.js                   # Vite config with custom plugins
├── vitest.config.js                 # Vitest configuration
├── package.json
├── .prettierrc                      # Prettier config
└── CLAUDE.md                        # AI assistant instructions
```

## Key Entry Points
- **App Entry**: `src/main.js` → `App.svelte`
- **State Management**: `src/lib/settings-store.svelte.js`
- **Provider Factory**: `src/lib/providers/index.ts`

## Build Flow
1. Vite builds from `index.html` + `src/main.js`
2. Custom plugins inject theme script and exclude manifest
3. `scripts/build-manifest.js` generates browser-specific manifest

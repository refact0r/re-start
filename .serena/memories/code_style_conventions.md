# Code Style and Conventions

## Prettier Configuration
- **Tab Width**: 4 spaces
- **Semicolons**: No (omit semicolons)
- **Quotes**: Single quotes
- **Trailing Commas**: ES5 style

## JavaScript Conventions
- Use ES modules (`import`/`export`)
- Vanilla JavaScript (no TypeScript)
- Use `const` for constants, `let` for variables
- Arrow functions preferred for callbacks
- Descriptive variable and function names (camelCase)

## Svelte 5 Patterns
- Use runes: `$state`, `$effect`, `$derived`, `$derived.by()`
- Component files: `*.svelte`
- Reactive stores: `*.svelte.js` (e.g., `settings-store.svelte.js`)
- Use document visibility API to pause updates when tab is hidden

## Provider Pattern
- Abstract base class in `task-provider.ts`
- Implementations extend base class
- Factory functions in `providers/index.ts`:
  - `createTaskProvider(type, config)`
  - `createCalendarProvider()`

## Naming Conventions
- Files: kebab-case (`date-matcher.js`, `weather-api.js`)
- Components: PascalCase (`Clock.svelte`, `Weather.svelte`)
- Functions/variables: camelCase
- Constants: camelCase or UPPER_SNAKE_CASE for true constants

## CSS Conventions
- CSS variables for theming: `--bg-1/2/3`, `--txt-1/2/3/4`, `--txt-err`, `--font-family`
- Themes defined in `src/lib/themes.js`
- Custom CSS injection via `<style id="custom-css">` element
- Frosted glass effect class: `body.has-background`

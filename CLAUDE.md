# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

re-start is a TUI-style browser startpage extension built with Svelte 5. It features task management (local, Todoist, Google Tasks), weather display, customizable quick links, and multiple color themes. The extension targets both Firefox and Chrome.

## Commands

```bash
npm run dev          # Run dev server at localhost:5173
npm run build:firefox  # Build for Firefox → dist/firefox
npm run build:chrome   # Build for Chrome → dist/chrome
npm run watch        # Build + watch for Firefox (use with web-ext run)
npm test             # Run vitest tests
```

## Architecture

### Entry Point Flow
`src/main.js` → mounts `App.svelte` → renders widgets (Clock, Weather, Tasks, Links, Stats) + Settings modal

### State Management
Uses Svelte 5 runes (`$state`, `$effect`) in `src/lib/settings-store.svelte.js`. Settings persist to localStorage and reactive effects in App.svelte handle theme/CSS/font updates.

### Task Backend System
Abstract backend pattern in `src/lib/backends/`:
- `task-backend.js` - base class defining interface (sync, getTasks, addTask, completeTask, etc.)
- `localstorage-backend.js` - browser-only storage
- `todoist-backend.js` - Todoist Sync API v1 with incremental sync tokens
- `google-tasks-backend.js` - OAuth via popup + PKCE flow (web-based)

Factory function `createTaskBackend(type, config)` in `src/lib/backends/index.js` instantiates the appropriate backend.

### Theming
Themes defined in `src/lib/themes.js` as CSS variable maps. Theme data is injected at build time via `vite.config.js` plugin and applied before render via IIFE in `index.html` (prevents flash). Runtime updates via `document.documentElement.style.setProperty()`.

CSS variables: `--bg-1/2/3`, `--txt-1/2/3/4`, `--txt-err`, `--font-family`

### Smart Date Parsing
`src/lib/date-matcher.js` provides natural language date parsing for task input. Used by `AddTask.svelte` to highlight parsed dates in real-time.

### Build System
Vite with custom plugins in `vite.config.js`:
- `injectThemeScript()` - extracts theme colors and injects loader into HTML
- `excludeManifest()` - removes manifest.json (generated per-target by `scripts/build-manifest.js`)

## Key Patterns

- Components use document visibility API to pause updates when tab is hidden
- Weather/tasks sync on tab focus with localStorage caching
- Settings trigger reactive effects in App.svelte for theme/CSS/font changes
- `needsConfiguration` computed property shows pulsing settings button when required settings are missing

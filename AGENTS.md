# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Structure

This repo contains **two separate applications**:

| App | Directory | Stack | Purpose |
|-----|-----------|-------|---------|
| **Frontend** | `frontend/` | Svelte 5 + TypeScript + Vite | Browser extension / web app UI |
| **Backend** | `backend/` | Node.js + Express + SQLite | OAuth token management API |

The frontend can run standalone as a browser extension, or as a web app with the backend providing Google OAuth token refresh.

## Build/Lint/Test Commands

### Frontend (run from `frontend/`)
```bash
npm run dev            # Dev server at localhost:5173
npm run build:firefox  # Build → dist/firefox
npm run build:chrome   # Build → dist/chrome
npm test               # Run all vitest tests
npm test -- -t "test name"           # Run single test by name
npm test -- src/lib/tests/file.test.ts  # Run specific test file
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier format
npm run format:check   # Prettier check
```

### Backend (run from `backend/`)
```bash
npm start              # node server.js (port 3004)
npm run dev            # node --watch server.js
```

### Development Setup (both apps)
```bash
# Terminal 1 - Backend
cd backend && npm run dev     # OAuth API on :3004

# Terminal 2 - Frontend  
cd frontend && npm run dev    # Vite dev server on :5173, proxies /api/* to :3004
```

## Code Style (Frontend)

### Formatting (Prettier)
- **4-space indentation**
- **No semicolons**
- **Single quotes** for strings
- **Trailing commas** (ES5 style)

### TypeScript
- Strict mode with `noUncheckedIndexedAccess: true`
- Use `type` keyword for type-only imports: `import type { Task } from '../types'`
- Prefix unused params with `_`: `function handler(_event: Event)`

### Import Order
```typescript
// 1. External libraries
import { describe, it, expect } from 'vitest'
import { onMount } from 'svelte'

// 2. Type imports
import type { Task, Settings } from '../types'

// 3. Internal modules
import TaskProvider from './task-provider'
import { createLogger } from '../logger'
import { NetworkError, AuthError } from '../errors'

// 4. Components (use barrel imports)
import { Panel, Text, Button } from './ui'
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Files (TS) | kebab-case | `task-provider.ts` |
| Files (Svelte) | PascalCase | `Settings.svelte` |
| Classes | PascalCase | `TodoistProvider` |
| Functions | camelCase | `createTaskProvider()` |
| Private methods | `_` prefix | `_loadFromStorage()` |
| Variables | camelCase | `syncToken` |
| Types/Interfaces | PascalCase | `TaskProviderConfig` |
| CSS variables | `--kebab-case` | `--bg-1`, `--txt-err` |
| localStorage keys | snake_case | `todoist_sync_token` |

## Svelte 5 Patterns (Frontend)

### State Management (Runes)
```svelte
<script lang="ts">
    let count = $state(0)
    let items = $state<Item[]>([])
    let total = $derived(items.length)
    let filtered = $derived.by(() => items.filter(i => i.active))
    
    $effect(() => {
        localStorage.setItem('count', String(count))
    })
</script>
```

### Component Props
```svelte
<script lang="ts">
    interface Props {
        title: string
        onClose: () => void
    }
    let { title, onClose }: Props = $props()
</script>
```

### Event Handlers
- Use `onclick` not `on:click` (Svelte 5 syntax)
- Inline: `onclick={() => (visible = false)}`
- Named: `onclick={handleClick}`

## Error Handling (Frontend)

### Error Hierarchy
```
BackendError (base)
├── NetworkError      // Network failures, timeouts
├── AuthError         // Auth/token failures
├── RateLimitError    // API rate limiting
├── ValidationError   // Invalid data
└── SyncError         // Sync failures
```

### Factory Methods
```typescript
NetworkError.fromResponse(response)
AuthError.invalidToken()
AuthError.sessionExpired()
RateLimitError.fromHeader(retryAfterHeader)
ValidationError.parseError(err)
SyncError.failed(err)
```

### Pattern
```typescript
import { createLogger } from '../logger'
import { NetworkError, AuthError, SyncError } from '../errors'

const logger = createLogger('MyBackend')

try {
    const response = await fetch(url)
    if (!response.ok) {
        if (response.status === 401) throw AuthError.invalidToken()
        if (response.status === 429) throw RateLimitError.fromHeader(response.headers.get('Retry-After'))
        throw NetworkError.fromResponse(response)
    }
} catch (error) {
    if (error instanceof BackendError) throw error  // Don't re-wrap
    logger.error('Operation failed:', error)
    throw this.wrapError(error, 'context', SyncError)
}
```

## Backend (Node.js)

### Structure
```
backend/
├── server.js           # Express app entry point (port 3004)
├── routes/auth.js      # Google OAuth routes (/api/auth/*)
├── db/tokens.js        # SQLite token storage
└── .env                # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL
```

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/google/url` | Generate OAuth URL |
| GET | `/api/auth/google/callback` | OAuth callback handler |
| POST | `/api/auth/google/refresh` | Refresh access token |
| POST | `/api/auth/google/logout` | Revoke and delete tokens |
| GET | `/api/auth/google/status` | Check auth status |
| GET | `/api/health` | Health check |

### Style
- ES Modules (`"type": "module"`)
- No TypeScript (plain JS)
- Same formatting: 4-space indent, no semicolons, single quotes

## Testing (Frontend)

### Test File Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../uuid', () => ({
    generateUUID: vi.fn(() => 'mock-uuid'),
}))

describe('ModuleName', () => {
    beforeEach(() => { /* setup */ })
    
    describe('methodName', () => {
        it('does specific thing', () => {
            expect(fn(input)).toBe(expected)
        })
    })
})
```

## Key Files

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/App.svelte` | Root component, layout |
| `frontend/src/lib/settings-store.svelte.ts` | Global settings state |
| `frontend/src/lib/providers/index.ts` | Task provider factory |
| `frontend/src/lib/providers/google-auth/` | Google OAuth client |
| `frontend/src/lib/errors.ts` | Error class hierarchy |
| `frontend/src/lib/types.ts` | TypeScript types |

### Backend
| File | Purpose |
|------|---------|
| `backend/server.js` | Express server entry |
| `backend/routes/auth.js` | OAuth route handlers |
| `backend/db/tokens.js` | Token CRUD operations |

## Do's and Don'ts

### Both Apps
- **Do** use 4-space indentation, single quotes, no semicolons
- **Do** check `response.ok` before parsing JSON

### Frontend
- **Do** use typed error classes from `errors.ts`
- **Do** use `createLogger('ModuleName')` for logging
- **Do** use barrel imports: `import { Panel, Text } from './ui'`
- **Do** prefix unused parameters with `_`
- **Do** use `$state`, `$derived`, `$effect` for reactivity
- **Don't** use `on:click` (use `onclick`)
- **Don't** re-wrap `BackendError` instances
- **Don't** forget `type` keyword for type-only imports

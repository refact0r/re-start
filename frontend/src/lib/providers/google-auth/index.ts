/**
 * Google OAuth Module
 * Barrel export for backward compatibility
 *
 * This module re-exports all public APIs from the refactored google-auth modules.
 * Existing code can continue to import from './google-auth' without changes.
 */

// Re-export auth store from stores
export { authStore } from '../../stores/auth-store'

// Token operations
export { ensureValidToken } from './token'

// Storage operations
export {
    getUserEmail,
    hasStoredUserId,
    hasMeetScope,
    migrateStorageKeys,
} from './storage'

// API requests
export { apiRequest, createApiClient } from './api'

// Scope management
export { refreshScopes } from './scopes'

// Auth state
export { isSignedIn } from './auth-state'

// OAuth flow
export { handleAuthCallback, signIn, signOut, tryRestoreSession } from './oauth'

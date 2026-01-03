/**
 * Google OAuth localStorage operations
 * Handles token storage, retrieval, and scope management
 */

import { generateUUID } from '../../uuid'
import {
    TOKEN_KEY,
    TOKEN_EXPIRY_KEY,
    USER_EMAIL_KEY,
    USER_ID_KEY,
    SCOPES_KEY,
    MEET_SCOPE,
} from './constants'
import { log } from './logger'

/**
 * Get or create a unique user ID for this browser
 */
export function getUserId(): string {
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem(USER_ID_KEY, userId)
        log('Created new user ID:', userId)
    }
    return userId
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get user email
 */
export function getUserEmail(): string | null {
    return localStorage.getItem(USER_EMAIL_KEY)
}

/**
 * Check if there's a stored user ID (indicates previous sign-in attempt)
 */
export function hasStoredUserId(): boolean {
    return !!localStorage.getItem(USER_ID_KEY)
}

/**
 * Store tokens in localStorage
 * Note: Caller is responsible for updating auth state
 */
export function storeTokens(
    accessToken: string,
    expiresIn: string | null,
    email: string | null = null
): void {
    localStorage.setItem(TOKEN_KEY, accessToken)

    const expiresInMs = (parseInt(expiresIn || '3600', 10) || 3600) * 1000
    const expiryTime = Date.now() + expiresInMs
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())

    if (email) {
        localStorage.setItem(USER_EMAIL_KEY, email)
    }

    const expiresInMin = Math.round(expiresInMs / 60000)
    log('Tokens stored', {
        email,
        expiresIn: `${expiresInMin} minutes`,
        expiryTime: new Date(expiryTime).toISOString(),
    })
}

/**
 * Clear all stored tokens
 * Note: Caller is responsible for updating auth state
 */
export function clearTokens(): void {
    log('Clearing all tokens from localStorage')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
    localStorage.removeItem(SCOPES_KEY)
}

/**
 * Check if a specific scope is granted
 */
export function hasScope(scope: string): boolean {
    const scopes = localStorage.getItem(SCOPES_KEY) || ''
    return scopes.split(' ').includes(scope)
}

/**
 * Check if Meet scope is granted
 */
export function hasMeetScope(): boolean {
    return hasScope(MEET_SCOPE)
}

/**
 * Migrate from old storage keys to new ones
 */
export function migrateStorageKeys(): void {
    const oldTokenKey = 'google_tasks_token'
    const oldExpiryKey = 'google_tasks_token_expiry'

    const oldToken = localStorage.getItem(oldTokenKey)
    if (oldToken && !localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, oldToken)
        localStorage.removeItem(oldTokenKey)
    }

    const oldExpiry = localStorage.getItem(oldExpiryKey)
    if (oldExpiry && !localStorage.getItem(TOKEN_EXPIRY_KEY)) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, oldExpiry)
        localStorage.removeItem(oldExpiryKey)
    }
}

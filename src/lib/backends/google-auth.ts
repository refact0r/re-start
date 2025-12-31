/**
 * Google OAuth module using backend server
 * Handles authentication via backend OAuth flow with refresh tokens
 */

import { authStore } from '../stores/auth-store'
import { get } from 'svelte/store'

// Storage keys
const TOKEN_KEY = 'google_oauth_token'
const TOKEN_EXPIRY_KEY = 'google_oauth_token_expiry'
const USER_EMAIL_KEY = 'google_user_email'
const USER_ID_KEY = 'google_user_id'
const SCOPES_KEY = 'google_oauth_scopes'

// Required scope for creating Meet links
const MEET_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

// Backend API URL - always relative, Vite proxy handles dev routing
const API_URL = ''

// Token refresh buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

// Logging prefix for easy filtering
const LOG_PREFIX = '[GoogleAuth]'

function log(...args: unknown[]): void {
    console.log(LOG_PREFIX, ...args)
}

function logWarn(...args: unknown[]): void {
    console.warn(LOG_PREFIX, ...args)
}

function logError(...args: unknown[]): void {
    console.error(LOG_PREFIX, ...args)
}

// Re-export authStore for backwards compatibility
export { authStore }

// Helper functions to update auth state
function setAuthenticated(email: string | null): void {
    log('Auth state: authenticated', { email })
    authStore.setAuthenticated(email)
}

function setUnauthenticated(): void {
    log('Auth state: unauthenticated')
    authStore.setUnauthenticated()
}

// Initialize - status stays 'unknown' until tryRestoreSession runs
function initAuthState(): void {
    const email = localStorage.getItem(USER_EMAIL_KEY)
    authStore.setEmail(email)
    log('Initial auth state: unknown', { email })
}

// Internal version that doesn't update state (to avoid circular calls)
function isTokenExpiredInternal(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry, 10)
}

interface TokenInfo {
    scope?: string
    error?: string
}

/**
 * Validate token by making a test API call to Google
 * Returns true if token is valid, false otherwise
 * Also stores granted scopes
 */
async function validateToken(token: string): Promise<boolean> {
    if (!token) return false

    try {
        log('Validating token with Google API...')
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token)

        if (response.ok) {
            const data = await response.json() as TokenInfo
            // Store granted scopes
            if (data.scope) {
                localStorage.setItem(SCOPES_KEY, data.scope)
                log('Token is valid, scopes:', data.scope)
            } else {
                log('Token is valid')
            }
            return true
        } else {
            const data = await response.json() as TokenInfo
            logWarn('Token validation failed:', data.error || response.status)
            return false
        }
    } catch (error) {
        logError('Token validation error:', (error as Error).message)
        return false
    }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Get or create a unique user ID for this browser
 */
function getUserId(): string {
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem(USER_ID_KEY, userId)
        log('Created new user ID:', userId)
    }
    return userId
}

/**
 * Check if the current token is expired
 */
export function isTokenExpired(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry, 10)
}

/**
 * Check if token needs refresh (expired or expiring soon)
 */
export function needsRefresh(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry, 10) - REFRESH_BUFFER_MS
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
 * Fetch and update scopes from token
 */
export async function refreshScopes(): Promise<boolean> {
    const token = getAccessToken()
    if (!token) return false

    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token)
        if (response.ok) {
            const data = await response.json() as TokenInfo
            if (data.scope) {
                localStorage.setItem(SCOPES_KEY, data.scope)
                return true
            }
        }
    } catch (error) {
        logError('Failed to refresh scopes:', (error as Error).message)
    }
    return false
}

/**
 * Check if authenticated (based on authStore status)
 */
export function isSignedIn(): boolean {
    return get(authStore).status === 'authenticated'
}

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken: string, expiresIn: string | null, email: string | null = null): void {
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
        expiryTime: new Date(expiryTime).toISOString()
    })

    setAuthenticated(email)
}

/**
 * Clear all stored tokens
 */
function clearTokens(): void {
    log('Clearing all tokens from localStorage')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
    localStorage.removeItem(SCOPES_KEY)

    setUnauthenticated()
}

interface AuthCallbackResult {
    success: boolean
    email?: string | null
    error?: string | null
}

/**
 * Handle OAuth callback parameters from URL
 * Call this on page load to process auth redirects
 */
export function handleAuthCallback(): AuthCallbackResult | null {
    const params = new URLSearchParams(window.location.search)

    if (params.has('auth_success')) {
        log('OAuth callback: SUCCESS')
        const accessToken = params.get('access_token')
        const expiresIn = params.get('expires_in')
        const email = params.get('email')

        if (accessToken) {
            storeTokens(accessToken, expiresIn, email)
        }

        // Clean URL
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
        log('OAuth callback complete, user signed in:', email)
        return { success: true, email }
    }

    if (params.has('auth_error')) {
        const error = params.get('auth_error')
        logError('OAuth callback: ERROR', error)

        // Clean URL
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
        return { success: false, error }
    }

    log('No OAuth callback params in URL')
    return null
}

interface RefreshResponse {
    access_token: string
    expires_in: string
    email: string
    error?: string
}

/**
 * Refresh access token using backend
 */
async function refreshToken(): Promise<string> {
    const userId = getUserId()
    log('Refreshing token for user:', userId)

    const response = await fetch(`${API_URL}/api/auth/google/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })

    if (!response.ok) {
        const error = await response.json() as RefreshResponse
        logError('Token refresh failed:', error.error)
        if (error.error === 'not_authenticated' || error.error === 'refresh_token_expired') {
            clearTokens()
            throw new Error('Session expired. Please sign in again.')
        }
        throw new Error(error.error || 'Token refresh failed')
    }

    const data = await response.json() as RefreshResponse
    log('Token refresh successful')
    storeTokens(data.access_token, data.expires_in, data.email)
    return data.access_token
}

/**
 * Ensure we have a valid access token, refreshing if needed
 */
export async function ensureValidToken(): Promise<string> {
    const token = getAccessToken()
    const expired = isTokenExpired()
    const needs = needsRefresh()

    log('ensureValidToken check:', {
        hasToken: !!token,
        isExpired: expired,
        needsRefresh: needs
    })

    // If no token, try to refresh from backend
    if (!token) {
        log('No token found, attempting refresh')
        try {
            return await refreshToken()
        } catch (error) {
            logError('No token and refresh failed')
            throw new Error('Not signed in')
        }
    }

    // If token needs refresh, refresh it
    if (needs) {
        log('Token needs refresh, attempting refresh')
        try {
            return await refreshToken()
        } catch (error) {
            // If refresh fails but token is still valid, use it
            if (!expired) {
                logWarn('Refresh failed but token still valid, using existing token')
                return token
            }
            logError('Refresh failed and token expired')
            throw error
        }
    }

    log('Token is valid, no refresh needed')
    return token
}

/**
 * Generic API request helper for Google APIs
 * Handles authentication, error handling, and response parsing
 * @param url - Full URL to request
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response typed as T
 */
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await ensureValidToken()

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    })

    if (response.status === 401) {
        throw new Error('Unauthorized: Access token is invalid or expired')
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json() as T
}

interface AuthUrlResponse {
    url: string
}

/**
 * Sign in - redirect to Google OAuth via backend
 */
export async function signIn(): Promise<void> {
    const userId = getUserId()
    log('Starting sign in flow for user:', userId)

    const response = await fetch(`${API_URL}/api/auth/google/url?user_id=${userId}`)
    if (!response.ok) {
        logError('Failed to get auth URL')
        throw new Error('Failed to get auth URL')
    }

    const data = await response.json() as AuthUrlResponse
    log('Redirecting to Google OAuth:', data.url.substring(0, 80) + '...')
    window.location.href = data.url
}

/**
 * Sign out - clear tokens locally and revoke on backend
 */
export async function signOut(): Promise<void> {
    const userId = getUserId()
    log('Signing out user:', userId)

    try {
        await fetch(`${API_URL}/api/auth/google/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        })
        log('Backend logout successful')
    } catch (e) {
        logWarn('Failed to logout on backend:', e)
    }

    clearTokens()
    log('Sign out complete')
}

/**
 * Try to restore a previous session by refreshing the token
 * Call this on page load when settings indicate user was signed in
 * Returns true if session was restored, false otherwise
 */
export async function tryRestoreSession(): Promise<boolean> {
    log('Attempting to restore session...')

    const userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
        log('No stored user ID')
        setUnauthenticated()
        return false
    }

    const token = getAccessToken()
    const expired = isTokenExpiredInternal()

    // If token exists and not expired, validate it with Google
    const tokenValid = token && !expired && await validateToken(token)

    if (!tokenValid) {
        // Token missing, expired, or invalid - try to refresh
        log('Token needs refresh (missing:', !token, ', expired:', expired, ')')
        try {
            await refreshToken()
        } catch (error) {
            logError('Session restore failed:', (error as Error).message)
            setUnauthenticated()
            return false
        }
    }

    log('Session restored successfully')
    setAuthenticated(localStorage.getItem(USER_EMAIL_KEY))
    return true
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

// Initialize auth state on module load
initAuthState()

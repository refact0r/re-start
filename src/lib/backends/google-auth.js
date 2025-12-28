/**
 * Google OAuth module using backend server
 * Handles authentication via backend OAuth flow with refresh tokens
 */

// Storage keys
const TOKEN_KEY = 'google_oauth_token'
const TOKEN_EXPIRY_KEY = 'google_oauth_token_expiry'
const USER_EMAIL_KEY = 'google_user_email'
const USER_ID_KEY = 'google_user_id'

// Backend API URL - use localhost in dev, empty string (relative) in production
const API_URL = import.meta.env.DEV ? 'http://localhost:3004' : ''

// Token refresh buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Get or create a unique user ID for this browser
 */
function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem(USER_ID_KEY, userId)
    }
    return userId
}

/**
 * Check if the current token is expired
 */
export function isTokenExpired() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry, 10)
}

/**
 * Check if token needs refresh (expired or expiring soon)
 */
export function needsRefresh() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry, 10) - REFRESH_BUFFER_MS
}

/**
 * Get the current access token
 */
export function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get user email
 */
export function getUserEmail() {
    return localStorage.getItem(USER_EMAIL_KEY)
}

/**
 * Check if signed in (has valid non-expired token)
 */
export function isSignedIn() {
    const token = getAccessToken()
    return !!token && !isTokenExpired()
}

/**
 * Check if signed in (alias)
 */
export function getIsSignedIn() {
    return isSignedIn()
}

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken, expiresIn, email = null) {
    localStorage.setItem(TOKEN_KEY, accessToken)

    const expiresInMs = (parseInt(expiresIn, 10) || 3600) * 1000
    const expiryTime = Date.now() + expiresInMs
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())

    if (email) {
        localStorage.setItem(USER_EMAIL_KEY, email)
    }
}

/**
 * Clear all stored tokens
 */
function clearTokens() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
}

/**
 * Handle OAuth callback parameters from URL
 * Call this on page load to process auth redirects
 */
export function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search)

    if (params.has('auth_success')) {
        const accessToken = params.get('access_token')
        const expiresIn = params.get('expires_in')
        const email = params.get('email')

        if (accessToken) {
            storeTokens(accessToken, expiresIn, email)
        }

        // Clean URL
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
        return { success: true, email }
    }

    if (params.has('auth_error')) {
        const error = params.get('auth_error')

        // Clean URL
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
        return { success: false, error }
    }

    return null
}

/**
 * Check authentication status with backend
 */
export async function checkAuthStatus() {
    const userId = getUserId()
    try {
        const response = await fetch(`${API_URL}/api/auth/google/status?user_id=${userId}`)
        if (!response.ok) return { authenticated: false }
        return await response.json()
    } catch (error) {
        console.error('Failed to check auth status:', error)
        return { authenticated: false }
    }
}

/**
 * Refresh access token using backend
 */
async function refreshToken() {
    const userId = getUserId()

    const response = await fetch(`${API_URL}/api/auth/google/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })

    if (!response.ok) {
        const error = await response.json()
        if (error.error === 'not_authenticated' || error.error === 'refresh_token_expired') {
            clearTokens()
            throw new Error('Session expired. Please sign in again.')
        }
        throw new Error(error.error || 'Token refresh failed')
    }

    const data = await response.json()
    storeTokens(data.access_token, data.expires_in, data.email)
    return data.access_token
}

/**
 * Ensure we have a valid access token, refreshing if needed
 */
export async function ensureValidToken() {
    const token = getAccessToken()

    // If no token, try to refresh from backend
    if (!token) {
        try {
            return await refreshToken()
        } catch (error) {
            throw new Error('Not signed in')
        }
    }

    // If token needs refresh, refresh it
    if (needsRefresh()) {
        try {
            return await refreshToken()
        } catch (error) {
            // If refresh fails but token is still valid, use it
            if (!isTokenExpired()) {
                return token
            }
            throw error
        }
    }

    return token
}

/**
 * Sign in - redirect to Google OAuth via backend
 */
export async function signIn() {
    const userId = getUserId()

    const response = await fetch(`${API_URL}/api/auth/google/url?user_id=${userId}`)
    if (!response.ok) {
        throw new Error('Failed to get auth URL')
    }

    const data = await response.json()
    window.location.href = data.url
}

/**
 * Sign out - clear tokens locally and revoke on backend
 */
export async function signOut() {
    const userId = getUserId()

    try {
        await fetch(`${API_URL}/api/auth/google/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        })
    } catch (e) {
        console.warn('Failed to logout on backend:', e)
    }

    clearTokens()
}

/**
 * Migrate from old storage keys to new ones
 */
export function migrateStorageKeys() {
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

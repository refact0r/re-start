/**
 * Google OAuth module using Google Identity Services (GIS)
 * https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */

// Storage keys
const TOKEN_KEY = 'google_oauth_token'
const TOKEN_EXPIRY_KEY = 'google_oauth_token_expiry'
const USER_EMAIL_KEY = 'google_user_email'

// OAuth configuration
const CLIENT_ID = '317653837986-8hsogqkfab632ducq6k0jcpngn1iub6a.apps.googleusercontent.com'
const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

// Token refresh buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

// GIS token client instance
let tokenClient = null
let gsiLoaded = false

/**
 * Load Google Identity Services library
 */
function loadGsiScript() {
    return new Promise((resolve, reject) => {
        if (gsiLoaded) {
            resolve()
            return
        }

        // Check if already loaded
        if (window.google?.accounts?.oauth2) {
            gsiLoaded = true
            resolve()
            return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
            gsiLoaded = true
            resolve()
        }
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
        document.head.appendChild(script)
    })
}

/**
 * Initialize the token client
 */
async function getTokenClient() {
    if (tokenClient) return tokenClient

    await loadGsiScript()

    return new Promise((resolve) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => {}, // Will be overridden per-request
        })
        resolve(tokenClient)
    })
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
function storeTokens(accessToken, expiresIn) {
    localStorage.setItem(TOKEN_KEY, accessToken)

    const expiresInMs = (parseInt(expiresIn, 10) || 3600) * 1000
    const expiryTime = Date.now() + expiresInMs
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
}

/**
 * Fetch and store user email
 */
async function fetchUserEmail(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!response.ok) {
            console.error('Failed to fetch user email:', response.status)
            return null
        }

        const data = await response.json()
        localStorage.setItem(USER_EMAIL_KEY, data.email)
        return data.email
    } catch (error) {
        console.error('Error fetching user email:', error)
        return null
    }
}

/**
 * Request a new access token (for refresh)
 */
async function requestToken(prompt = '') {
    const client = await getTokenClient()

    return new Promise((resolve, reject) => {
        client.callback = async (response) => {
            if (response.error) {
                reject(new Error(response.error_description || response.error))
                return
            }

            storeTokens(response.access_token, response.expires_in)
            await fetchUserEmail(response.access_token)
            resolve(response.access_token)
        }

        client.error_callback = (error) => {
            reject(new Error(error.message || 'Token request failed'))
        }

        // Request token - prompt='' for silent refresh, 'consent' for new sign-in
        if (prompt) {
            client.requestAccessToken({ prompt })
        } else {
            client.requestAccessToken()
        }
    })
}

/**
 * Ensure we have a valid access token, refreshing if needed
 */
export async function ensureValidToken() {
    const token = getAccessToken()

    if (!token) {
        throw new Error('Not signed in')
    }

    if (needsRefresh()) {
        try {
            // Try silent token refresh
            return await requestToken('')
        } catch (error) {
            // If silent refresh fails and token is still valid, use it
            if (!isTokenExpired()) {
                return token
            }
            throw new Error('Session expired. Please sign in again.')
        }
    }

    return token
}

/**
 * Sign in - request access token with user consent
 */
export async function signIn() {
    return requestToken('consent')
}

/**
 * Sign out - clear all tokens and revoke
 */
export async function signOut() {
    const token = getAccessToken()

    if (token && window.google?.accounts?.oauth2) {
        try {
            google.accounts.oauth2.revoke(token, () => {
                console.log('Token revoked')
            })
        } catch (e) {
            console.warn('Failed to revoke token:', e)
        }
    }

    clearTokens()
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

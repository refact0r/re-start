/**
 * Google OAuth module for Web Applications
 * Uses OAuth 2.0 authorization code flow with PKCE
 * Shared by Google Tasks and Google Calendar backends
 */

// Storage keys
const TOKEN_KEY = 'google_oauth_token'
const TOKEN_EXPIRY_KEY = 'google_oauth_token_expiry'
const REFRESH_TOKEN_KEY = 'google_oauth_refresh_token'
const USER_EMAIL_KEY = 'google_user_email'

// OAuth configuration
const CLIENT_ID = '317653837986-8hsogqkfab632ducq6k0jcpngn1iub6a.apps.googleusercontent.com'
const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
]

// Token refresh buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Generate a cryptographically random code verifier for PKCE
 */
function generateCodeVerifier() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return base64UrlEncode(array)
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64UrlEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Get the redirect URI based on current location
 */
function getRedirectUri() {
    const basePath = window.location.pathname.replace(/\/[^/]*$/, '')
    return `${window.location.origin}${basePath}/oauth-callback.html`
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
 * Get the current refresh token
 */
export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Get user email
 */
export function getUserEmail() {
    return localStorage.getItem(USER_EMAIL_KEY)
}

/**
 * Check if signed in (has valid token)
 */
export function isSignedIn() {
    const token = getAccessToken()
    const refreshToken = getRefreshToken()
    // Signed in if we have a refresh token (can get new access token) or valid access token
    return !!refreshToken || (!!token && !isTokenExpired())
}

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken, expiresIn, refreshToken = null) {
    localStorage.setItem(TOKEN_KEY, accessToken)

    const expiresInMs = (parseInt(expiresIn, 10) || 3600) * 1000
    const expiryTime = Date.now() + expiresInMs
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())

    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
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
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code, codeVerifier) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            redirect_uri: getRedirectUri(),
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error_description || error.error || 'Token exchange failed')
    }

    return response.json()
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken() {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
        throw new Error('No refresh token available')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: CLIENT_ID,
            grant_type: 'refresh_token'
        })
    })

    if (!response.ok) {
        const error = await response.json()
        // If refresh token is revoked or invalid, clear all tokens
        if (error.error === 'invalid_grant') {
            clearTokens()
            throw new Error('Session expired. Please sign in again.')
        }
        throw new Error(error.error_description || error.error || 'Token refresh failed')
    }

    const data = await response.json()
    storeTokens(data.access_token, data.expires_in)

    return data.access_token
}

/**
 * Ensure we have a valid access token, refreshing if needed
 */
export async function ensureValidToken() {
    if (!isSignedIn()) {
        throw new Error('Not signed in')
    }

    if (needsRefresh()) {
        return refreshAccessToken()
    }

    return getAccessToken()
}

/**
 * Sign in using popup-based OAuth authorization code flow with PKCE
 */
export async function signIn() {
    const state = crypto.randomUUID()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store for verification after redirect
    sessionStorage.setItem('oauth_state', state)
    sessionStorage.setItem('oauth_code_verifier', codeVerifier)

    const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authURL.searchParams.set('client_id', CLIENT_ID)
    authURL.searchParams.set('redirect_uri', getRedirectUri())
    authURL.searchParams.set('response_type', 'code')
    authURL.searchParams.set('scope', SCOPES.join(' '))
    authURL.searchParams.set('state', state)
    authURL.searchParams.set('code_challenge', codeChallenge)
    authURL.searchParams.set('code_challenge_method', 'S256')
    authURL.searchParams.set('access_type', 'offline')
    authURL.searchParams.set('prompt', 'consent')

    return new Promise((resolve, reject) => {
        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
            authURL.href,
            'Google Sign In',
            `width=${width},height=${height},left=${left},top=${top},popup=1`
        )

        if (!popup) {
            sessionStorage.removeItem('oauth_state')
            sessionStorage.removeItem('oauth_code_verifier')
            reject(new Error('Popup blocked. Please allow popups for this site.'))
            return
        }

        const handleMessage = async (event) => {
            if (event.origin !== window.location.origin) return

            if (event.data?.type === 'oauth-callback') {
                window.removeEventListener('message', handleMessage)
                popup.close()

                if (event.data.error) {
                    sessionStorage.removeItem('oauth_state')
                    sessionStorage.removeItem('oauth_code_verifier')
                    reject(new Error(event.data.error_description || event.data.error))
                    return
                }

                const { code, state: returnedState } = event.data
                const savedState = sessionStorage.getItem('oauth_state')
                const savedVerifier = sessionStorage.getItem('oauth_code_verifier')

                // Clean up
                sessionStorage.removeItem('oauth_state')
                sessionStorage.removeItem('oauth_code_verifier')

                if (returnedState !== savedState) {
                    reject(new Error('State mismatch - possible CSRF attack'))
                    return
                }

                if (!code) {
                    reject(new Error('No authorization code received'))
                    return
                }

                try {
                    // Exchange code for tokens
                    const tokens = await exchangeCodeForTokens(code, savedVerifier)
                    storeTokens(tokens.access_token, tokens.expires_in, tokens.refresh_token)

                    // Fetch user email
                    await fetchUserEmail(tokens.access_token)

                    resolve(tokens.access_token)
                } catch (error) {
                    reject(error)
                }
            }
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed without completing auth
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed)
                window.removeEventListener('message', handleMessage)
                sessionStorage.removeItem('oauth_state')
                sessionStorage.removeItem('oauth_code_verifier')
                reject(new Error('Sign in cancelled'))
            }
        }, 500)
    })
}

/**
 * Sign out - clear all tokens
 */
export function signOut() {
    clearTokens()
}

/**
 * Clear all stored tokens
 */
function clearTokens() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
}

/**
 * Migrate from old storage keys (google_tasks_*) to new ones (google_oauth_*)
 */
export function migrateStorageKeys() {
    const oldTokenKey = 'google_tasks_token'
    const oldExpiryKey = 'google_tasks_token_expiry'
    const oldEmailKey = 'google_user_email'

    // Check if migration is needed
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

    // Email key stays the same, no migration needed
}

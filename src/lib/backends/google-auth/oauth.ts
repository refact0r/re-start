/**
 * Google OAuth flow management
 * Handles sign in, sign out, OAuth callbacks, and session restoration
 */

import { API_URL, USER_ID_KEY, USER_EMAIL_KEY } from './constants'
import { log, logWarn, logError } from './logger'
import type { AuthCallbackResult, AuthUrlResponse } from './types'
import { getUserId, getAccessToken, storeTokens, clearTokens } from './storage'
import { setAuthenticated, setUnauthenticated } from './auth-state'
import { isTokenExpired, validateToken, refreshToken } from './token'

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
            setAuthenticated(email)
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

/**
 * Sign in - redirect to Google OAuth via backend
 */
export async function signIn(): Promise<void> {
    const userId = getUserId()
    log('Starting sign in flow for user:', userId)

    const response = await fetch(
        `${API_URL}/api/auth/google/url?user_id=${userId}`
    )
    if (!response.ok) {
        logError('Failed to get auth URL')
        throw new Error('Failed to get auth URL')
    }

    const data = (await response.json()) as AuthUrlResponse
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
            body: JSON.stringify({ user_id: userId }),
        })
        log('Backend logout successful')
    } catch (e) {
        logWarn('Failed to logout on backend:', e)
    }

    clearTokens()
    setUnauthenticated()
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
    const expired = isTokenExpired()

    // If token exists and not expired, validate it with Google
    const tokenValid = token && !expired && (await validateToken(token))

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

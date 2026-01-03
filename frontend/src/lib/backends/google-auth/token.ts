/**
 * Google OAuth token operations
 * Handles token validation, expiration checks, and token refresh
 */

import { TOKEN_KEY, TOKEN_EXPIRY_KEY, REFRESH_BUFFER_MS, API_URL, SCOPES_KEY, USER_EMAIL_KEY } from './constants'
import { log, logWarn, logError } from './logger'
import type { TokenInfo, RefreshResponse } from './types'
import { getUserId } from './storage'
import { setAuthenticated, setUnauthenticated } from './auth-state'

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
 * Validate token by making a test API call to Google
 * Returns true if token is valid, false otherwise
 * Also stores granted scopes
 */
export async function validateToken(token: string): Promise<boolean> {
    if (!token) return false

    try {
        log('Validating token with Google API...')
        const response = await fetch(
            'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' +
                token
        )

        if (response.ok) {
            const data = (await response.json()) as TokenInfo
            // Store granted scopes
            if (data.scope) {
                localStorage.setItem(SCOPES_KEY, data.scope)
                log('Token is valid, scopes:', data.scope)
            } else {
                log('Token is valid')
            }
            return true
        } else {
            const data = (await response.json()) as TokenInfo
            logWarn('Token validation failed:', data.error || response.status)
            return false
        }
    } catch (error) {
        logError('Token validation error:', (error as Error).message)
        return false
    }
}

/**
 * Store tokens in localStorage
 * Note: Caller is responsible for updating auth state
 */
function storeTokens(
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

/**
 * Refresh access token using backend
 */
export async function refreshToken(): Promise<string> {
    const userId = getUserId()
    log('Refreshing token for user:', userId)

    const response = await fetch(`${API_URL}/api/auth/google/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    })

    if (!response.ok) {
        const error = (await response.json()) as RefreshResponse
        logError('Token refresh failed:', error.error)
        if (
            error.error === 'not_authenticated' ||
            error.error === 'refresh_token_expired'
        ) {
            clearTokens()
            throw new Error('Session expired. Please sign in again.')
        }
        throw new Error(error.error || 'Token refresh failed')
    }

    const data = (await response.json()) as RefreshResponse
    log('Token refresh successful')
    storeTokens(data.access_token, data.expires_in, data.email)
    return data.access_token
}

/**
 * Ensure we have a valid access token, refreshing if needed
 */
export async function ensureValidToken(): Promise<string> {
    const token = localStorage.getItem(TOKEN_KEY)
    const expired = isTokenExpired()
    const needs = needsRefresh()

    log('ensureValidToken check:', {
        hasToken: !!token,
        isExpired: expired,
        needsRefresh: needs,
    })

    // If no token, try to refresh from backend
    if (!token) {
        log('No token found, attempting refresh')
        try {
            return await refreshToken()
        } catch (_error) {
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
                logWarn(
                    'Refresh failed but token still valid, using existing token'
                )
                return token
            }
            logError('Refresh failed and token expired')
            throw error
        }
    }

    log('Token is valid, no refresh needed')
    return token
}

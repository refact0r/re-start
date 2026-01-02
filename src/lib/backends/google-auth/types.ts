/**
 * Google OAuth TypeScript types
 * Interfaces for token validation, auth callbacks, and API responses
 */

/**
 * Token info response from Google API
 */
export interface TokenInfo {
    scope?: string
    error?: string
}

/**
 * Result of OAuth callback processing
 */
export interface AuthCallbackResult {
    success: boolean
    email?: string | null
    error?: string | null
}

/**
 * Response from backend token refresh endpoint
 */
export interface RefreshResponse {
    access_token: string
    expires_in: string
    email: string
    error?: string
}

/**
 * Response from backend auth URL endpoint
 */
export interface AuthUrlResponse {
    url: string
}

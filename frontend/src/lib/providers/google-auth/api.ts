/**
 * Google OAuth API request helper
 * Generic wrapper for making authenticated requests to Google APIs
 */

import { ensureValidToken } from './token'
import { AuthError, NetworkError } from '../../errors'

/**
 * Generic API request helper for Google APIs
 * Handles authentication, error handling, and response parsing
 * @param url - Full URL to request
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response typed as T
 */
export async function apiRequest<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await ensureValidToken()

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    })

    if (response.status === 401) {
        throw AuthError.invalidToken('Unauthorized: Access token is invalid or expired')
    }

    if (!response.ok) {
        throw NetworkError.fromResponse(response)
    }

    return (await response.json()) as T
}

/**
 * Create an API client with a base URL
 * Returns a function that prepends the base URL to endpoint paths
 * @param baseUrl - Base URL for the API (e.g., 'https://tasks.googleapis.com/tasks/v1')
 * @returns Function that makes requests to baseUrl + endpoint
 */
export function createApiClient(baseUrl: string) {
    return async function <T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        return apiRequest<T>(`${baseUrl}${endpoint}`, options)
    }
}

/**
 * Google OAuth scope management
 * Handles fetching and updating granted scopes
 */

import { getAccessToken } from './storage'
import { logError } from './logger'
import { SCOPES_KEY } from './constants'
import type { TokenInfo } from './types'

/**
 * Fetch and update scopes from token
 */
export async function refreshScopes(): Promise<boolean> {
    const token = getAccessToken()
    if (!token) return false

    try {
        const response = await fetch(
            'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' +
                token
        )
        if (response.ok) {
            const data = (await response.json()) as TokenInfo
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

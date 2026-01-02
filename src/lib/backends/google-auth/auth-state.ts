/**
 * Google OAuth auth state management
 * Handles authentication status tracking and state updates
 */

import { get } from 'svelte/store'
import { authStore } from '../../stores/auth-store'
import { USER_EMAIL_KEY } from './constants'
import { log } from './logger'

/**
 * Set authenticated state with user email
 */
export function setAuthenticated(email: string | null): void {
    log('Auth state: authenticated', { email })
    authStore.setAuthenticated(email)
}

/**
 * Set unauthenticated state
 */
export function setUnauthenticated(): void {
    log('Auth state: unauthenticated')
    authStore.setUnauthenticated()
}

/**
 * Initialize auth state on module load
 * Status stays 'unknown' until tryRestoreSession runs
 */
export function initAuthState(): void {
    const email = localStorage.getItem(USER_EMAIL_KEY)
    authStore.setEmail(email)
    log('Initial auth state: unknown', { email })
}

/**
 * Check if authenticated (based on authStore status)
 */
export function isSignedIn(): boolean {
    return get(authStore).status === 'authenticated'
}

// Initialize auth state on module load
initAuthState()

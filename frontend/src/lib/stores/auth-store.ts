import { writable } from 'svelte/store'

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

export interface AuthState {
    status: AuthStatus
    email: string | null
}

const initialState: AuthState = {
    status: 'unknown',
    email: null,
}

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>(initialState)

    return {
        subscribe,
        setAuthenticated: (email: string | null) => {
            update((state) => {
                if (state.status === 'authenticated' && state.email === email) {
                    return state
                }
                return { status: 'authenticated', email }
            })
        },
        setUnauthenticated: () => {
            update((state) => {
                if (state.status === 'unauthenticated') {
                    return state
                }
                return { status: 'unauthenticated', email: null }
            })
        },
        setEmail: (email: string | null) => {
            update((state) => ({ ...state, email }))
        },
        reset: () => set(initialState),
    }
}

export const authStore = createAuthStore()

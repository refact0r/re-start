import { writable } from 'svelte/store'

export enum AuthStatus {
    Unknown = 'unknown',
    Authenticated = 'authenticated',
    Unauthenticated = 'unauthenticated',
}

export interface AuthState {
    status: AuthStatus
    email: string | null
}

const initialState: AuthState = {
    status: AuthStatus.Unknown,
    email: null,
}

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>(initialState)

    return {
        subscribe,
        setAuthenticated: (email: string | null) => {
            update((state) => {
                if (
                    state.status === AuthStatus.Authenticated &&
                    state.email === email
                ) {
                    return state
                }
                return { status: AuthStatus.Authenticated, email }
            })
        },
        setUnauthenticated: () => {
            update((state) => {
                if (state.status === AuthStatus.Unauthenticated) {
                    return state
                }
                return { status: AuthStatus.Unauthenticated, email: null }
            })
        },
        setEmail: (email: string | null) => {
            update((state) => ({ ...state, email }))
        },
        reset: () => set(initialState),
    }
}

export const authStore = createAuthStore()

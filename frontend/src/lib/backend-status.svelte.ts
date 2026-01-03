// Backend API URL - always relative, Vite proxy handles dev routing
const API_URL = ''

// Health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL_MS = 30 * 1000

// Internal cache tracking
let lastBackendCheck = 0

interface BackendStatus {
    isOnline: boolean | null
}

export const backendStatus: BackendStatus = $state({
    isOnline: null,
})

/**
 * Check if the backend server is running
 * Returns true if backend is reachable, false otherwise
 */
export async function checkBackendHealth(): Promise<boolean> {
    // Use cached result if checked recently
    const now = Date.now()
    if (
        backendStatus.isOnline !== null &&
        now - lastBackendCheck < HEALTH_CHECK_INTERVAL_MS
    ) {
        return backendStatus.isOnline
    }

    try {
        console.log('[Backend] Checking health...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${API_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal,
        })

        clearTimeout(timeoutId)
        lastBackendCheck = now

        backendStatus.isOnline = response.ok
        console.log(
            '[Backend] Status:',
            backendStatus.isOnline ? 'online' : 'offline'
        )
        return backendStatus.isOnline
    } catch (error) {
        console.log('[Backend] Health check failed:', (error as Error).message)
        lastBackendCheck = now
        backendStatus.isOnline = false
        return false
    }
}

/**
 * Force a backend health check (bypasses cache)
 */
export async function forceCheckBackendHealth(): Promise<boolean> {
    lastBackendCheck = 0
    backendStatus.isOnline = null
    return checkBackendHealth()
}

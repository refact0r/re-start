// UUID v4 generation utility with fallback support for older environments

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID when available, otherwise falls back to
 * manual implementation using Math.random().
 *
 * @returns A valid UUID v4 format string (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export function generateUUID(): string {
    // Use native crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }

    // Fallback to manual UUID v4 generation for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

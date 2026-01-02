/**
 * Google OAuth logging utilities
 * Provides consistent logging with prefix for filtering
 */

// Logging prefix for easy filtering
const LOG_PREFIX = '[GoogleAuth]'

/**
 * Log a message with GoogleAuth prefix
 */
export function log(...args: unknown[]): void {
    console.log(LOG_PREFIX, ...args)
}

/**
 * Log a warning with GoogleAuth prefix
 */
export function logWarn(...args: unknown[]): void {
    console.warn(LOG_PREFIX, ...args)
}

/**
 * Log an error with GoogleAuth prefix
 */
export function logError(...args: unknown[]): void {
    console.error(LOG_PREFIX, ...args)
}

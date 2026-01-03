/**
 * Unified logging utility for consistent logging across the application
 * Provides structured logging with prefixes and log levels
 */

/**
 * Logger instance returned by createLogger
 */
export interface Logger {
    /** Log informational messages */
    log(...args: unknown[]): void
    /** Log warning messages */
    warn(...args: unknown[]): void
    /** Log error messages */
    error(...args: unknown[]): void
}

/**
 * Create a logger instance with a specific prefix
 * @param prefix - Prefix to prepend to all log messages (e.g., 'GoogleAuth', 'Todoist')
 * @returns Logger instance with log, warn, and error methods
 *
 * @example
 * ```ts
 * const logger = createLogger('GoogleAuth')
 * logger.log('User signed in:', { email: 'user@example.com' })
 * logger.warn('Token expiring soon')
 * logger.error('Authentication failed:', error)
 * ```
 */
export function createLogger(prefix: string): Logger {
    const formattedPrefix = `[${prefix}]`

    return {
        log(...args: unknown[]): void {
            console.log(formattedPrefix, ...args)
        },

        warn(...args: unknown[]): void {
            console.warn(formattedPrefix, ...args)
        },

        error(...args: unknown[]): void {
            console.error(formattedPrefix, ...args)
        },
    }
}

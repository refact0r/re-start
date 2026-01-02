/**
 * Custom error types for backend operations
 * Provides structured error handling with error codes, user-friendly messages, and retry information
 */

/**
 * Error codes for categorizing backend errors
 */
export enum BackendErrorCode {
    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    NETWORK_OFFLINE = 'NETWORK_OFFLINE',

    // Auth errors
    AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
    AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
    AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
    AUTH_REFRESH_FAILED = 'AUTH_REFRESH_FAILED',
    AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',

    // Rate limit errors
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Validation errors
    VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
    VALIDATION_INVALID_RESPONSE = 'VALIDATION_INVALID_RESPONSE',
    VALIDATION_PARSE_ERROR = 'VALIDATION_PARSE_ERROR',

    // Sync errors
    SYNC_FAILED = 'SYNC_FAILED',
    SYNC_CONFLICT = 'SYNC_CONFLICT',
    SYNC_PARTIAL_FAILURE = 'SYNC_PARTIAL_FAILURE',

    // Generic errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base class for all backend errors
 * Extends Error with structured error information
 */
export class BackendError extends Error {
    /** Error code for programmatic error handling */
    public readonly code: BackendErrorCode

    /** Original error that caused this error (if any) */
    public readonly originalError?: Error

    /** Whether this error is retryable */
    public readonly isRetryable: boolean

    /** User-friendly error message */
    public readonly userMessage: string

    constructor(
        message: string,
        code: BackendErrorCode = BackendErrorCode.UNKNOWN_ERROR,
        options?: {
            originalError?: Error
            isRetryable?: boolean
            userMessage?: string
        }
    ) {
        super(message)
        this.name = 'BackendError'
        this.code = code
        this.originalError = options?.originalError
        this.isRetryable = options?.isRetryable ?? false
        this.userMessage = options?.userMessage || message

        // Maintain proper stack trace for where our error was thrown (V8 only)
        if ('captureStackTrace' in Error) {
            (Error as typeof Error & { captureStackTrace: (target: object, constructor: Function) => void }).captureStackTrace(this, this.constructor)
        }

        // Preserve original error stack if available
        if (options?.originalError?.stack) {
            this.stack = `${this.stack}\nCaused by: ${options.originalError.stack}`
        }
    }
}

/**
 * Network-related errors (fetch failures, timeouts, offline)
 */
export class NetworkError extends BackendError {
    /** HTTP status code (if applicable) */
    public readonly statusCode?: number

    /** HTTP status text (if applicable) */
    public readonly statusText?: string

    constructor(
        message: string,
        options?: {
            originalError?: Error
            isRetryable?: boolean
            userMessage?: string
            statusCode?: number
            statusText?: string
            code?: BackendErrorCode
        }
    ) {
        super(
            message,
            options?.code || BackendErrorCode.NETWORK_ERROR,
            {
                ...options,
                isRetryable: options?.isRetryable ?? true,
                userMessage:
                    options?.userMessage ||
                    'Network error occurred. Please check your connection and try again.',
            }
        )
        this.name = 'NetworkError'
        this.statusCode = options?.statusCode
        this.statusText = options?.statusText
    }

    /**
     * Create NetworkError from fetch response
     */
    static fromResponse(
        response: Response,
        options?: { originalError?: Error }
    ): NetworkError {
        const message = `HTTP ${response.status}: ${response.statusText}`
        const userMessage =
            response.status >= 500
                ? 'Server error occurred. Please try again later.'
                : `Request failed: ${response.statusText}`

        return new NetworkError(message, {
            statusCode: response.status,
            statusText: response.statusText,
            originalError: options?.originalError,
            isRetryable: response.status >= 500 || response.status === 429,
            userMessage,
        })
    }

    /**
     * Create NetworkError for timeout
     */
    static timeout(message = 'Request timed out'): NetworkError {
        return new NetworkError(message, {
            code: BackendErrorCode.NETWORK_TIMEOUT,
            isRetryable: true,
            userMessage: 'Request timed out. Please try again.',
        })
    }

    /**
     * Create NetworkError for offline
     */
    static offline(message = 'Network is offline'): NetworkError {
        return new NetworkError(message, {
            code: BackendErrorCode.NETWORK_OFFLINE,
            isRetryable: true,
            userMessage: 'You appear to be offline. Please check your connection.',
        })
    }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends BackendError {
    constructor(
        message: string,
        options?: {
            originalError?: Error
            isRetryable?: boolean
            userMessage?: string
            code?: BackendErrorCode
        }
    ) {
        super(
            message,
            options?.code || BackendErrorCode.AUTH_UNAUTHORIZED,
            {
                ...options,
                isRetryable: options?.isRetryable ?? false,
                userMessage:
                    options?.userMessage ||
                    'Authentication failed. Please sign in again.',
            }
        )
        this.name = 'AuthError'
    }

    /**
     * Create AuthError for invalid token
     */
    static invalidToken(message = 'Invalid access token'): AuthError {
        return new AuthError(message, {
            code: BackendErrorCode.AUTH_INVALID_TOKEN,
            userMessage: 'Your session is invalid. Please sign in again.',
        })
    }

    /**
     * Create AuthError for expired token
     */
    static tokenExpired(message = 'Access token expired'): AuthError {
        return new AuthError(message, {
            code: BackendErrorCode.AUTH_TOKEN_EXPIRED,
            userMessage: 'Your session has expired. Please sign in again.',
        })
    }

    /**
     * Create AuthError for refresh failure
     */
    static refreshFailed(
        message = 'Token refresh failed',
        originalError?: Error
    ): AuthError {
        return new AuthError(message, {
            code: BackendErrorCode.AUTH_REFRESH_FAILED,
            originalError,
            userMessage: 'Failed to refresh your session. Please sign in again.',
        })
    }

    /**
     * Create AuthError for session expired
     */
    static sessionExpired(
        message = 'Session expired. Please sign in again.'
    ): AuthError {
        return new AuthError(message, {
            code: BackendErrorCode.AUTH_SESSION_EXPIRED,
            userMessage: 'Your session has expired. Please sign in again.',
        })
    }

    /**
     * Create AuthError for unauthorized
     */
    static unauthorized(message = 'Unauthorized'): AuthError {
        return new AuthError(message, {
            code: BackendErrorCode.AUTH_UNAUTHORIZED,
            userMessage: 'You are not authorized to perform this action.',
        })
    }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends BackendError {
    /** When to retry (Unix timestamp in ms, or null if unknown) */
    public readonly retryAfter: number | null

    constructor(
        message: string,
        options?: {
            originalError?: Error
            userMessage?: string
            retryAfter?: number | null
        }
    ) {
        const retryAfter = options?.retryAfter ?? null
        const retryMessage = retryAfter
            ? ` Try again after ${new Date(retryAfter).toLocaleTimeString()}.`
            : ' Please try again later.'

        super(message, BackendErrorCode.RATE_LIMIT_EXCEEDED, {
            ...options,
            isRetryable: true,
            userMessage:
                options?.userMessage ||
                `Rate limit exceeded.${retryMessage}`,
        })
        this.name = 'RateLimitError'
        this.retryAfter = retryAfter
    }

    /**
     * Create RateLimitError from Retry-After header
     * @param retryAfterHeader - Value of Retry-After header (seconds or HTTP date)
     */
    static fromHeader(
        retryAfterHeader: string | null,
        message = 'Rate limit exceeded'
    ): RateLimitError {
        let retryAfter: number | null = null

        if (retryAfterHeader) {
            // Try parsing as seconds first
            const seconds = parseInt(retryAfterHeader, 10)
            if (!isNaN(seconds)) {
                retryAfter = Date.now() + seconds * 1000
            } else {
                // Try parsing as HTTP date
                const date = new Date(retryAfterHeader)
                if (!isNaN(date.getTime())) {
                    retryAfter = date.getTime()
                }
            }
        }

        return new RateLimitError(message, { retryAfter })
    }
}

/**
 * Validation errors (invalid input, parse errors, schema mismatches)
 */
export class ValidationError extends BackendError {
    /** Field name that failed validation (if applicable) */
    public readonly field?: string

    constructor(
        message: string,
        options?: {
            originalError?: Error
            isRetryable?: boolean
            userMessage?: string
            field?: string
            code?: BackendErrorCode
        }
    ) {
        super(
            message,
            options?.code || BackendErrorCode.VALIDATION_INVALID_INPUT,
            {
                ...options,
                isRetryable: options?.isRetryable ?? false,
                userMessage:
                    options?.userMessage || 'Invalid data. Please check your input.',
            }
        )
        this.name = 'ValidationError'
        this.field = options?.field
    }

    /**
     * Create ValidationError for parse errors (e.g., JSON parse)
     */
    static parseError(
        message = 'Failed to parse data',
        originalError?: Error
    ): ValidationError {
        return new ValidationError(message, {
            code: BackendErrorCode.VALIDATION_PARSE_ERROR,
            originalError,
            userMessage: 'Failed to parse data. The data may be corrupted.',
        })
    }

    /**
     * Create ValidationError for invalid response
     */
    static invalidResponse(
        message = 'Invalid response from server',
        originalError?: Error
    ): ValidationError {
        return new ValidationError(message, {
            code: BackendErrorCode.VALIDATION_INVALID_RESPONSE,
            originalError,
            userMessage: 'Received invalid response from server. Please try again.',
        })
    }

    /**
     * Create ValidationError for invalid input
     */
    static invalidInput(message: string, field?: string): ValidationError {
        return new ValidationError(message, {
            code: BackendErrorCode.VALIDATION_INVALID_INPUT,
            field,
            userMessage: field
                ? `Invalid ${field}. ${message}`
                : `Invalid input. ${message}`,
        })
    }
}

/**
 * Synchronization errors (sync failures, conflicts)
 */
export class SyncError extends BackendError {
    /** Details about what failed to sync */
    public readonly syncDetails?: string

    constructor(
        message: string,
        options?: {
            originalError?: Error
            isRetryable?: boolean
            userMessage?: string
            syncDetails?: string
            code?: BackendErrorCode
        }
    ) {
        super(message, options?.code || BackendErrorCode.SYNC_FAILED, {
            ...options,
            isRetryable: options?.isRetryable ?? true,
            userMessage:
                options?.userMessage ||
                'Synchronization failed. Please try again.',
        })
        this.name = 'SyncError'
        this.syncDetails = options?.syncDetails
    }

    /**
     * Create SyncError for general sync failure
     */
    static failed(
        message = 'Synchronization failed',
        originalError?: Error
    ): SyncError {
        return new SyncError(message, {
            code: BackendErrorCode.SYNC_FAILED,
            originalError,
            isRetryable: true,
        })
    }

    /**
     * Create SyncError for sync conflict
     */
    static conflict(
        message = 'Sync conflict detected',
        syncDetails?: string
    ): SyncError {
        return new SyncError(message, {
            code: BackendErrorCode.SYNC_CONFLICT,
            syncDetails,
            isRetryable: false,
            userMessage: 'Sync conflict detected. Please refresh and try again.',
        })
    }

    /**
     * Create SyncError for partial failure
     */
    static partialFailure(
        message = 'Some items failed to sync',
        syncDetails?: string
    ): SyncError {
        return new SyncError(message, {
            code: BackendErrorCode.SYNC_PARTIAL_FAILURE,
            syncDetails,
            isRetryable: true,
            userMessage: 'Some items failed to sync. Please try again.',
        })
    }
}

import { describe, it, expect } from 'vitest'
import {
	BackendError,
	BackendErrorCode,
	NetworkError,
	AuthError,
	RateLimitError,
	ValidationError,
	SyncError,
} from '../errors'

describe('BackendError', () => {
	it('creates error with default values', () => {
		const error = new BackendError('Test error')

		expect(error).toBeInstanceOf(Error)
		expect(error).toBeInstanceOf(BackendError)
		expect(error.name).toBe('BackendError')
		expect(error.message).toBe('Test error')
		expect(error.code).toBe(BackendErrorCode.UNKNOWN_ERROR)
		expect(error.isRetryable).toBe(false)
		expect(error.userMessage).toBe('Test error')
		expect(error.originalError).toBeUndefined()
	})

	it('creates error with custom code', () => {
		const error = new BackendError('Test error', BackendErrorCode.NETWORK_ERROR)

		expect(error.code).toBe(BackendErrorCode.NETWORK_ERROR)
	})

	it('creates error with custom options', () => {
		const originalError = new Error('Original')
		const error = new BackendError('Test error', BackendErrorCode.NETWORK_ERROR, {
			originalError,
			isRetryable: true,
			userMessage: 'User-friendly message',
		})

		expect(error.isRetryable).toBe(true)
		expect(error.userMessage).toBe('User-friendly message')
		expect(error.originalError).toBe(originalError)
	})

	it('preserves stack trace', () => {
		const error = new BackendError('Test error')

		expect(error.stack).toBeDefined()
		expect(error.stack).toContain('BackendError')
	})

	it('chains original error stack trace', () => {
		const originalError = new Error('Original error')
		const error = new BackendError('Test error', BackendErrorCode.UNKNOWN_ERROR, {
			originalError,
		})

		expect(error.stack).toContain('Caused by:')
		expect(error.stack).toContain('Original error')
	})
})

describe('NetworkError', () => {
	it('creates error with default values', () => {
		const error = new NetworkError('Network failed')

		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(NetworkError)
		expect(error.name).toBe('NetworkError')
		expect(error.message).toBe('Network failed')
		expect(error.code).toBe(BackendErrorCode.NETWORK_ERROR)
		expect(error.isRetryable).toBe(true) // Network errors are retryable by default
		expect(error.userMessage).toBe(
			'Network error occurred. Please check your connection and try again.'
		)
	})

	it('creates error with status code and text', () => {
		const error = new NetworkError('Server error', {
			statusCode: 500,
			statusText: 'Internal Server Error',
		})

		expect(error.statusCode).toBe(500)
		expect(error.statusText).toBe('Internal Server Error')
	})

	it('creates error with custom code', () => {
		const error = new NetworkError('Timeout', {
			code: BackendErrorCode.NETWORK_TIMEOUT,
		})

		expect(error.code).toBe(BackendErrorCode.NETWORK_TIMEOUT)
	})

	describe('fromResponse', () => {
		it('creates error from 500 response', () => {
			const response = new Response(null, {
				status: 500,
				statusText: 'Internal Server Error',
			})
			const error = NetworkError.fromResponse(response)

			expect(error.message).toBe('HTTP 500: Internal Server Error')
			expect(error.statusCode).toBe(500)
			expect(error.statusText).toBe('Internal Server Error')
			expect(error.isRetryable).toBe(true) // 5xx errors are retryable
			expect(error.userMessage).toBe('Server error occurred. Please try again later.')
		})

		it('creates error from 404 response', () => {
			const response = new Response(null, {
				status: 404,
				statusText: 'Not Found',
			})
			const error = NetworkError.fromResponse(response)

			expect(error.message).toBe('HTTP 404: Not Found')
			expect(error.statusCode).toBe(404)
			expect(error.isRetryable).toBe(false) // 4xx errors are not retryable (except 429)
			expect(error.userMessage).toBe('Request failed: Not Found')
		})

		it('creates retryable error from 429 response', () => {
			const response = new Response(null, {
				status: 429,
				statusText: 'Too Many Requests',
			})
			const error = NetworkError.fromResponse(response)

			expect(error.statusCode).toBe(429)
			expect(error.isRetryable).toBe(true) // 429 is retryable
		})

		it('includes original error when provided', () => {
			const response = new Response(null, { status: 500 })
			const originalError = new Error('Fetch failed')
			const error = NetworkError.fromResponse(response, { originalError })

			expect(error.originalError).toBe(originalError)
		})
	})

	describe('timeout', () => {
		it('creates timeout error with default message', () => {
			const error = NetworkError.timeout()

			expect(error.message).toBe('Request timed out')
			expect(error.code).toBe(BackendErrorCode.NETWORK_TIMEOUT)
			expect(error.isRetryable).toBe(true)
			expect(error.userMessage).toBe('Request timed out. Please try again.')
		})

		it('creates timeout error with custom message', () => {
			const error = NetworkError.timeout('API timeout')

			expect(error.message).toBe('API timeout')
		})
	})

	describe('offline', () => {
		it('creates offline error with default message', () => {
			const error = NetworkError.offline()

			expect(error.message).toBe('Network is offline')
			expect(error.code).toBe(BackendErrorCode.NETWORK_OFFLINE)
			expect(error.isRetryable).toBe(true)
			expect(error.userMessage).toBe('You appear to be offline. Please check your connection.')
		})

		it('creates offline error with custom message', () => {
			const error = NetworkError.offline('No connection')

			expect(error.message).toBe('No connection')
		})
	})
})

describe('AuthError', () => {
	it('creates error with default values', () => {
		const error = new AuthError('Auth failed')

		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(AuthError)
		expect(error.name).toBe('AuthError')
		expect(error.message).toBe('Auth failed')
		expect(error.code).toBe(BackendErrorCode.AUTH_UNAUTHORIZED)
		expect(error.isRetryable).toBe(false) // Auth errors are not retryable by default
		expect(error.userMessage).toBe('Authentication failed. Please sign in again.')
	})

	it('creates error with custom code', () => {
		const error = new AuthError('Token expired', {
			code: BackendErrorCode.AUTH_TOKEN_EXPIRED,
		})

		expect(error.code).toBe(BackendErrorCode.AUTH_TOKEN_EXPIRED)
	})

	describe('invalidToken', () => {
		it('creates invalid token error with default message', () => {
			const error = AuthError.invalidToken()

			expect(error.message).toBe('Invalid access token')
			expect(error.code).toBe(BackendErrorCode.AUTH_INVALID_TOKEN)
			expect(error.isRetryable).toBe(false)
			expect(error.userMessage).toBe('Your session is invalid. Please sign in again.')
		})

		it('creates invalid token error with custom message', () => {
			const error = AuthError.invalidToken('Bad token')

			expect(error.message).toBe('Bad token')
		})
	})

	describe('tokenExpired', () => {
		it('creates token expired error', () => {
			const error = AuthError.tokenExpired()

			expect(error.message).toBe('Access token expired')
			expect(error.code).toBe(BackendErrorCode.AUTH_TOKEN_EXPIRED)
			expect(error.userMessage).toBe('Your session has expired. Please sign in again.')
		})
	})

	describe('refreshFailed', () => {
		it('creates refresh failed error without original error', () => {
			const error = AuthError.refreshFailed()

			expect(error.message).toBe('Token refresh failed')
			expect(error.code).toBe(BackendErrorCode.AUTH_REFRESH_FAILED)
			expect(error.userMessage).toBe('Failed to refresh your session. Please sign in again.')
			expect(error.originalError).toBeUndefined()
		})

		it('creates refresh failed error with original error', () => {
			const originalError = new Error('Network error')
			const error = AuthError.refreshFailed('Refresh failed', originalError)

			expect(error.message).toBe('Refresh failed')
			expect(error.originalError).toBe(originalError)
		})
	})

	describe('sessionExpired', () => {
		it('creates session expired error', () => {
			const error = AuthError.sessionExpired()

			expect(error.message).toBe('Session expired. Please sign in again.')
			expect(error.code).toBe(BackendErrorCode.AUTH_SESSION_EXPIRED)
			expect(error.userMessage).toBe('Your session has expired. Please sign in again.')
		})
	})

	describe('unauthorized', () => {
		it('creates unauthorized error', () => {
			const error = AuthError.unauthorized()

			expect(error.message).toBe('Unauthorized')
			expect(error.code).toBe(BackendErrorCode.AUTH_UNAUTHORIZED)
			expect(error.userMessage).toBe('You are not authorized to perform this action.')
		})

		it('creates unauthorized error with custom message', () => {
			const error = AuthError.unauthorized('Access denied')

			expect(error.message).toBe('Access denied')
		})
	})
})

describe('RateLimitError', () => {
	it('creates error with default values', () => {
		const error = new RateLimitError('Rate limit exceeded')

		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(RateLimitError)
		expect(error.name).toBe('RateLimitError')
		expect(error.message).toBe('Rate limit exceeded')
		expect(error.code).toBe(BackendErrorCode.RATE_LIMIT_EXCEEDED)
		expect(error.isRetryable).toBe(true) // Rate limit errors are retryable
		expect(error.retryAfter).toBeNull()
		expect(error.userMessage).toBe('Rate limit exceeded. Please try again later.')
	})

	it('creates error with retryAfter timestamp', () => {
		const retryAfter = Date.now() + 60000 // 1 minute from now
		const error = new RateLimitError('Too many requests', { retryAfter })

		expect(error.retryAfter).toBe(retryAfter)
		expect(error.userMessage).toContain('Try again after')
	})

	describe('fromHeader', () => {
		it('parses retry-after header as seconds', () => {
			const error = RateLimitError.fromHeader('60')

			expect(error.retryAfter).toBeGreaterThan(Date.now())
			expect(error.retryAfter).toBeLessThanOrEqual(Date.now() + 61000) // Allow 1s tolerance
		})

		it('parses retry-after header as HTTP date', () => {
			const futureDate = new Date(Date.now() + 120000) // 2 minutes from now
			const error = RateLimitError.fromHeader(futureDate.toUTCString())

			expect(error.retryAfter).toBeGreaterThan(Date.now())
			expect(error.retryAfter).toBeLessThanOrEqual(futureDate.getTime() + 1000) // Allow 1s tolerance
		})

		it('handles null retry-after header', () => {
			const error = RateLimitError.fromHeader(null)

			expect(error.retryAfter).toBeNull()
			expect(error.userMessage).toBe('Rate limit exceeded. Please try again later.')
		})

		it('handles invalid retry-after header', () => {
			const error = RateLimitError.fromHeader('invalid')

			expect(error.retryAfter).toBeNull()
		})

		it('uses custom message', () => {
			const error = RateLimitError.fromHeader('60', 'API quota exceeded')

			expect(error.message).toBe('API quota exceeded')
		})
	})
})

describe('ValidationError', () => {
	it('creates error with default values', () => {
		const error = new ValidationError('Invalid data')

		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(ValidationError)
		expect(error.name).toBe('ValidationError')
		expect(error.message).toBe('Invalid data')
		expect(error.code).toBe(BackendErrorCode.VALIDATION_INVALID_INPUT)
		expect(error.isRetryable).toBe(false) // Validation errors are not retryable
		expect(error.userMessage).toBe('Invalid data. Please check your input.')
		expect(error.field).toBeUndefined()
	})

	it('creates error with field name', () => {
		const error = new ValidationError('Invalid email', { field: 'email' })

		expect(error.field).toBe('email')
	})

	it('creates error with custom code', () => {
		const error = new ValidationError('Parse failed', {
			code: BackendErrorCode.VALIDATION_PARSE_ERROR,
		})

		expect(error.code).toBe(BackendErrorCode.VALIDATION_PARSE_ERROR)
	})

	describe('parseError', () => {
		it('creates parse error with default message', () => {
			const error = ValidationError.parseError()

			expect(error.message).toBe('Failed to parse data')
			expect(error.code).toBe(BackendErrorCode.VALIDATION_PARSE_ERROR)
			expect(error.userMessage).toBe('Failed to parse data. The data may be corrupted.')
		})

		it('creates parse error with custom message', () => {
			const error = ValidationError.parseError('JSON parse failed')

			expect(error.message).toBe('JSON parse failed')
		})

		it('includes original error', () => {
			const originalError = new SyntaxError('Unexpected token')
			const error = ValidationError.parseError('Parse failed', originalError)

			expect(error.originalError).toBe(originalError)
		})
	})

	describe('invalidResponse', () => {
		it('creates invalid response error with default message', () => {
			const error = ValidationError.invalidResponse()

			expect(error.message).toBe('Invalid response from server')
			expect(error.code).toBe(BackendErrorCode.VALIDATION_INVALID_RESPONSE)
			expect(error.userMessage).toBe('Received invalid response from server. Please try again.')
		})

		it('includes original error', () => {
			const originalError = new Error('Schema mismatch')
			const error = ValidationError.invalidResponse('Bad schema', originalError)

			expect(error.message).toBe('Bad schema')
			expect(error.originalError).toBe(originalError)
		})
	})

	describe('invalidInput', () => {
		it('creates invalid input error without field', () => {
			const error = ValidationError.invalidInput('Must be positive')

			expect(error.message).toBe('Must be positive')
			expect(error.code).toBe(BackendErrorCode.VALIDATION_INVALID_INPUT)
			expect(error.userMessage).toBe('Invalid input. Must be positive')
			expect(error.field).toBeUndefined()
		})

		it('creates invalid input error with field', () => {
			const error = ValidationError.invalidInput('Must be positive', 'age')

			expect(error.message).toBe('Must be positive')
			expect(error.field).toBe('age')
			expect(error.userMessage).toBe('Invalid age. Must be positive')
		})
	})
})

describe('SyncError', () => {
	it('creates error with default values', () => {
		const error = new SyncError('Sync failed')

		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(SyncError)
		expect(error.name).toBe('SyncError')
		expect(error.message).toBe('Sync failed')
		expect(error.code).toBe(BackendErrorCode.SYNC_FAILED)
		expect(error.isRetryable).toBe(true) // Sync errors are retryable by default
		expect(error.userMessage).toBe('Synchronization failed. Please try again.')
		expect(error.syncDetails).toBeUndefined()
	})

	it('creates error with sync details', () => {
		const error = new SyncError('Partial sync failure', {
			syncDetails: '3 out of 10 items failed',
		})

		expect(error.syncDetails).toBe('3 out of 10 items failed')
	})

	it('creates error with custom code', () => {
		const error = new SyncError('Conflict', {
			code: BackendErrorCode.SYNC_CONFLICT,
		})

		expect(error.code).toBe(BackendErrorCode.SYNC_CONFLICT)
	})

	describe('failed', () => {
		it('creates sync failed error with default message', () => {
			const error = SyncError.failed()

			expect(error.message).toBe('Synchronization failed')
			expect(error.code).toBe(BackendErrorCode.SYNC_FAILED)
			expect(error.isRetryable).toBe(true)
		})

		it('creates sync failed error with custom message', () => {
			const error = SyncError.failed('API sync failed')

			expect(error.message).toBe('API sync failed')
		})

		it('includes original error', () => {
			const originalError = new Error('Network error')
			const error = SyncError.failed('Sync failed', originalError)

			expect(error.originalError).toBe(originalError)
		})
	})

	describe('conflict', () => {
		it('creates conflict error with default message', () => {
			const error = SyncError.conflict()

			expect(error.message).toBe('Sync conflict detected')
			expect(error.code).toBe(BackendErrorCode.SYNC_CONFLICT)
			expect(error.isRetryable).toBe(false) // Conflicts are not auto-retryable
			expect(error.userMessage).toBe('Sync conflict detected. Please refresh and try again.')
		})

		it('creates conflict error with sync details', () => {
			const error = SyncError.conflict('Version mismatch', 'Item ID: 123')

			expect(error.message).toBe('Version mismatch')
			expect(error.syncDetails).toBe('Item ID: 123')
		})
	})

	describe('partialFailure', () => {
		it('creates partial failure error with default message', () => {
			const error = SyncError.partialFailure()

			expect(error.message).toBe('Some items failed to sync')
			expect(error.code).toBe(BackendErrorCode.SYNC_PARTIAL_FAILURE)
			expect(error.isRetryable).toBe(true)
			expect(error.userMessage).toBe('Some items failed to sync. Please try again.')
		})

		it('creates partial failure error with sync details', () => {
			const error = SyncError.partialFailure('Partial sync', '2 of 5 failed')

			expect(error.message).toBe('Partial sync')
			expect(error.syncDetails).toBe('2 of 5 failed')
		})
	})
})

describe('Error wrapping and chaining', () => {
	it('wraps errors while preserving stack traces', () => {
		const originalError = new Error('Original error')
		const wrappedError = new NetworkError('Network failed', { originalError })

		expect(wrappedError.originalError).toBe(originalError)
		expect(wrappedError.stack).toContain('Caused by:')
		expect(wrappedError.stack).toContain('Original error')
	})

	it('chains multiple error levels', () => {
		const level1 = new Error('Level 1')
		const level2 = new NetworkError('Level 2', { originalError: level1 })
		const level3 = new SyncError('Level 3', { originalError: level2 as Error })

		expect(level3.originalError).toBe(level2)
		expect(level2.originalError).toBe(level1)
	})

	it('maintains error hierarchy through instanceof checks', () => {
		const error = new NetworkError('Test')

		expect(error).toBeInstanceOf(NetworkError)
		expect(error).toBeInstanceOf(BackendError)
		expect(error).toBeInstanceOf(Error)
	})
})

describe('isRetryable logic', () => {
	it('network errors are retryable by default', () => {
		const error = new NetworkError('Network failed')
		expect(error.isRetryable).toBe(true)
	})

	it('auth errors are not retryable by default', () => {
		const error = new AuthError('Unauthorized')
		expect(error.isRetryable).toBe(false)
	})

	it('rate limit errors are retryable', () => {
		const error = new RateLimitError('Too many requests')
		expect(error.isRetryable).toBe(true)
	})

	it('validation errors are not retryable by default', () => {
		const error = new ValidationError('Invalid input')
		expect(error.isRetryable).toBe(false)
	})

	it('sync errors are retryable by default', () => {
		const error = new SyncError('Sync failed')
		expect(error.isRetryable).toBe(true)
	})

	it('sync conflicts are not retryable', () => {
		const error = SyncError.conflict()
		expect(error.isRetryable).toBe(false)
	})

	it('can override default retryable behavior', () => {
		const retryableAuth = new AuthError('Temporary auth issue', { isRetryable: true })
		const nonRetryableNetwork = new NetworkError('Fatal network error', { isRetryable: false })

		expect(retryableAuth.isRetryable).toBe(true)
		expect(nonRetryableNetwork.isRetryable).toBe(false)
	})
})

describe('userMessage generation', () => {
	it('uses default user messages when not provided', () => {
		const networkError = new NetworkError('Fetch failed')
		const authError = new AuthError('Invalid token')
		const rateLimit = new RateLimitError('Too many requests')
		const validationError = new ValidationError('Bad data')
		const syncError = new SyncError('Sync failed')

		expect(networkError.userMessage).toBe(
			'Network error occurred. Please check your connection and try again.'
		)
		expect(authError.userMessage).toBe('Authentication failed. Please sign in again.')
		expect(rateLimit.userMessage).toBe('Rate limit exceeded. Please try again later.')
		expect(validationError.userMessage).toBe('Invalid data. Please check your input.')
		expect(syncError.userMessage).toBe('Synchronization failed. Please try again.')
	})

	it('uses custom user messages when provided', () => {
		const error = new NetworkError('Fetch failed', {
			userMessage: 'Unable to reach the server',
		})

		expect(error.userMessage).toBe('Unable to reach the server')
	})

	it('static factory methods provide context-specific user messages', () => {
		const timeout = NetworkError.timeout()
		const offline = NetworkError.offline()
		const tokenExpired = AuthError.tokenExpired()
		const parseError = ValidationError.parseError()

		expect(timeout.userMessage).toBe('Request timed out. Please try again.')
		expect(offline.userMessage).toBe('You appear to be offline. Please check your connection.')
		expect(tokenExpired.userMessage).toBe('Your session has expired. Please sign in again.')
		expect(parseError.userMessage).toBe('Failed to parse data. The data may be corrupted.')
	})
})

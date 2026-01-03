// Base class for task provider implementations
// Defines the interface that all providers must implement
//
// Error Handling Guidelines for Subclasses:
// - All public methods should catch errors and wrap them using wrapError()
// - Use specific error types (NetworkError, AuthError, SyncError, etc.) when the error type is known
// - For transient failures, check isRetryableError() before deciding whether to retry
// - Propagate BackendError instances without wrapping them again
// - Log errors using the logger utility before throwing them

import type { TaskProviderConfig, EnrichedTask } from '../types'
import { BackendError, NetworkError, SyncError, AuthError, ValidationError } from '../errors'

export interface TaskData {
    timestamp?: number
    [key: string]: unknown
}

abstract class TaskProvider {
    protected config: TaskProviderConfig
    protected data: TaskData = {}
    protected cacheExpiry = 0

    constructor(config: TaskProviderConfig) {
        if (new.target === TaskProvider) {
            throw new Error('TaskProvider is an abstract class')
        }
        this.config = config
    }

    /**
     * Synchronize tasks with the backend
     */
    abstract sync(resourceTypes?: string[]): Promise<void>

    /**
     * Get all tasks, filtered and sorted
     */
    abstract getTasks(): EnrichedTask[]

    /**
     * Add a new task
     */
    abstract addTask(content: string, due: string | null): Promise<void>

    /**
     * Mark a task as complete
     */
    abstract completeTask(taskId: string): Promise<void>

    /**
     * Mark a task as incomplete
     */
    abstract uncompleteTask(taskId: string): Promise<void>

    /**
     * Delete a task
     */
    abstract deleteTask(taskId: string): Promise<void>

    /**
     * Clear all local data/cache
     */
    abstract clearLocalData(): void

    /**
     * Sort tasks: unchecked first, then by completion time, due date, project
     */
    static sortTasks(tasks: EnrichedTask[]): EnrichedTask[] {
        return tasks.sort((a, b) => {
            // Unchecked tasks first
            if (a.checked !== b.checked) return a.checked ? 1 : -1

            // Checked tasks: sort by completed_at (recent first)
            if (a.checked) {
                if (a.completed_at && b.completed_at) {
                    const diff =
                        new Date(b.completed_at).getTime() -
                        new Date(a.completed_at).getTime()
                    if (diff !== 0) return diff
                }
            }

            // Tasks with due dates first
            if (!a.due_date && b.due_date) return 1
            if (a.due_date && !b.due_date) return -1

            // Sort by due date (earliest first)
            if (a.due_date && b.due_date) {
                const diff = a.due_date.getTime() - b.due_date.getTime()
                if (diff !== 0) return diff
            }

            // If both have no due dates, non-project tasks come first
            if (!a.due_date && !b.due_date) {
                const aHasProject = a.project_id && a.project_name !== 'Inbox'
                const bHasProject = b.project_id && b.project_name !== 'Inbox'

                if (aHasProject !== bHasProject) {
                    return aHasProject ? 1 : -1
                }
            }

            return a.child_order - b.child_order
        })
    }

    /**
     * Check if cache is stale (default implementation)
     * Subclasses should set this.data.timestamp and this.cacheExpiry
     */
    isCacheStale(): boolean {
        if (!this.data?.timestamp) return true
        return Date.now() - this.data.timestamp >= (this.cacheExpiry || 0)
    }

    /**
     * Invalidate cache to force fresh sync
     */
    invalidateCache(): void {
        if (this.data) {
            this.data.timestamp = 0
        }
    }

    /**
     * Get project name by ID
     */
    getProjectName(_projectId: string): string {
        return ''
    }

    /**
     * Get label names by IDs
     */
    getLabelNames(_labelIds: string[]): string[] {
        return []
    }

    /**
     * Wrap unknown errors into appropriate BackendError types
     *
     * This helper method provides consistent error wrapping across all backend implementations.
     * It converts unknown errors into typed BackendError instances, preserving the original error
     * for debugging while providing user-friendly messages.
     *
     * @param error - The error to wrap (can be Error, BackendError, or unknown)
     * @param context - Context string describing what operation failed (e.g., 'sync', 'addTask')
     * @param defaultErrorType - The BackendError subclass to use if error type can't be determined
     * @returns A BackendError instance (or subclass)
     *
     * @example
     * ```typescript
     * try {
     *   await this.apiCall()
     * } catch (error) {
     *   throw this.wrapError(error, 'sync', SyncError)
     * }
     * ```
     */
    protected wrapError(
        error: unknown,
        context: string
    ): BackendError {
        // If already a BackendError, return as-is
        if (error instanceof BackendError) {
            return error
        }

        // Convert to Error if not already
        const originalError = error instanceof Error ? error : new Error(String(error))
        const message = `${context} failed: ${originalError.message}`

        // Try to infer error type from message or properties
        const errorMessage = originalError.message.toLowerCase()

        // Network errors
        if (
            errorMessage.includes('fetch') ||
            errorMessage.includes('network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('offline')
        ) {
            return new NetworkError(message, {
                originalError,
                userMessage: 'Network error occurred. Please check your connection and try again.',
            })
        }

        // Auth errors
        if (
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('auth') ||
            errorMessage.includes('token') ||
            errorMessage.includes('401')
        ) {
            return new AuthError(message, {
                originalError,
                userMessage: 'Authentication failed. Please sign in again.',
            })
        }

        // Validation errors
        if (
            errorMessage.includes('invalid') ||
            errorMessage.includes('validation') ||
            errorMessage.includes('parse')
        ) {
            return new ValidationError(message, {
                originalError,
                userMessage: 'Invalid data encountered. Please check your input.',
            })
        }

        // Default to SyncError
        return new SyncError(message, {
            originalError,
            userMessage: 'Operation failed. Please try again.',
        })
    }

    /**
     * Check if an error is retryable
     *
     * This helper determines whether an operation that failed with the given error
     * should be retried. It checks the error's isRetryable flag if it's a BackendError,
     * or infers retry-ability based on error characteristics.
     *
     * @param error - The error to check
     * @returns true if the error indicates a transient failure that may succeed on retry
     *
     * @example
     * ```typescript
     * catch (error) {
     *   if (this.isRetryableError(error)) {
     *     // Retry logic
     *   } else {
     *     throw error
     *   }
     * }
     * ```
     */
    protected isRetryableError(error: unknown): boolean {
        // BackendError instances have explicit retry flag
        if (error instanceof BackendError) {
            return error.isRetryable
        }

        // For unknown errors, infer based on message
        if (error instanceof Error) {
            const message = error.message.toLowerCase()

            // Network errors are typically retryable
            if (
                message.includes('timeout') ||
                message.includes('network') ||
                message.includes('fetch failed') ||
                message.includes('offline')
            ) {
                return true
            }

            // Server errors (5xx) are typically retryable
            if (message.includes('500') || message.includes('502') || message.includes('503')) {
                return true
            }

            // Rate limit errors are retryable (after delay)
            if (message.includes('rate limit') || message.includes('429')) {
                return true
            }

            // Auth errors, validation errors are not retryable
            if (
                message.includes('unauthorized') ||
                message.includes('401') ||
                message.includes('403') ||
                message.includes('invalid') ||
                message.includes('validation')
            ) {
                return false
            }
        }

        // Conservative default: don't retry unknown errors
        return false
    }
}

export default TaskProvider

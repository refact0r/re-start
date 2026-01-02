import TaskBackend from './task-backend'
import * as googleAuth from './google-auth/'
import type { TaskBackendConfig, EnrichedTask } from '../types'
import { createLogger } from '../logger'
import { AuthError, SyncError } from '../errors'

interface GoogleTask {
    id: string
    title: string
    notes?: string
    status: 'needsAction' | 'completed'
    completed?: string
    due?: string
    position?: string
    parent?: string
    deleted?: boolean
    tasklistId?: string
    tasklistName?: string
}

interface GoogleTasklist {
    id: string
    title: string
}

interface GoogleTasksData {
    tasklists: GoogleTasklist[]
    tasks: GoogleTask[]
    timestamp?: number
}

interface GoogleTasksListResponse {
    items?: GoogleTask[]
}

interface GoogleTasklistsResponse {
    items?: GoogleTasklist[]
}

// Logger instance for Google Tasks operations
const logger = createLogger('GoogleTasks')

/**
 * Google Tasks API client for Web Applications
 * Uses shared Google OAuth module for authentication
 */
class GoogleTasksBackend extends TaskBackend {
    private baseUrl: string
    private dataKey: string
    private tasklistIdKey: string
    protected override data: GoogleTasksData
    protected override cacheExpiry: number
    private defaultTasklistId: string

    constructor(config: TaskBackendConfig = {}) {
        super(config)
        this.baseUrl = 'https://tasks.googleapis.com/tasks/v1'

        this.dataKey = 'google_tasks_data'
        this.tasklistIdKey = 'google_tasks_default_list'
        this.cacheExpiry = 5 * 60 * 1000 // 5 minutes

        // Migrate old storage keys if needed
        googleAuth.migrateStorageKeys()

        const storedData = localStorage.getItem(this.dataKey)
        this.data = storedData
            ? (JSON.parse(storedData) as GoogleTasksData)
            : { tasklists: [], tasks: [] }
        this.defaultTasklistId =
            localStorage.getItem(this.tasklistIdKey) ?? '@default'
    }

    /**
     * Sign in using Google OAuth
     */
    async signIn(): Promise<void> {
        return googleAuth.signIn()
    }

    /**
     * Get user email
     */
    getUserEmail(): string | null {
        return googleAuth.getUserEmail()
    }

    /**
     * Sign out
     */
    async signOut(): Promise<void> {
        await googleAuth.signOut()
        this.clearLocalData()
    }

    /**
     * Check if signed in
     */
    getIsSignedIn(): boolean {
        return googleAuth.isSignedIn()
    }

    /**
     * Ensure we have a valid token, refreshing if needed
     */
    async ensureValidToken(): Promise<string> {
        return googleAuth.ensureValidToken()
    }

    /**
     * Make an authenticated API request with auto-refresh
     * Delegates to shared googleAuth.apiRequest
     */
    private async apiRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`
        return googleAuth.apiRequest<T>(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })
    }

    /**
     * Sync tasks from Google Tasks API
     */
    async sync(
        resourceTypes: string[] = ['tasklists', 'tasks']
    ): Promise<GoogleTasksData> {
        if (!this.getIsSignedIn()) {
            logger.error('Sync attempted while not signed in')
            throw AuthError.unauthorized('Not signed in to Google account')
        }

        try {
            logger.log('Syncing with Google Tasks:', { resourceTypes })

            if (resourceTypes.includes('tasklists')) {
                const data = await this.apiRequest<GoogleTasklistsResponse>(
                    '/users/@me/lists?maxResults=20'
                )
                this.data.tasklists = data.items || []

                const hasValidTasklist = this.data.tasklists.some(
                    (tl) => tl.id === this.defaultTasklistId
                )
                if (!this.defaultTasklistId || !hasValidTasklist) {
                    this.defaultTasklistId =
                        this.data.tasklists[0]?.id ?? '@default'
                    localStorage.setItem(
                        this.tasklistIdKey,
                        this.defaultTasklistId
                    )
                }
            }

            if (resourceTypes.includes('tasks')) {
                const tasklists = this.data.tasklists || []

                if (tasklists.length === 0) {
                    this.data.tasks = []
                } else {
                    const taskPromises = tasklists.map(async (tasklist) => {
                        const data =
                            await this.apiRequest<GoogleTasksListResponse>(
                                `/lists/${tasklist.id}/tasks?showCompleted=true&showHidden=true&maxResults=100`
                            )
                        return (data.items || []).map((task) => ({
                            ...task,
                            tasklistId: tasklist.id,
                            tasklistName: tasklist.title,
                        }))
                    })

                    const taskArrays = await Promise.all(taskPromises)
                    this.data.tasks = taskArrays.flat()
                }
            }

            this.data.timestamp = Date.now()
            localStorage.setItem(this.dataKey, JSON.stringify(this.data))

            logger.log('Google Tasks sync successful:', {
                tasklists: this.data.tasklists.length,
                tasks: this.data.tasks.length,
            })

            return this.data
        } catch (error) {
            // Re-throw BackendError instances as-is (from google-auth)
            if (error instanceof AuthError || error instanceof SyncError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Google Tasks sync failed:', error)
            throw this.wrapError(error, 'Google Tasks sync', SyncError)
        }
    }

    /**
     * Get upcoming tasks and recently completed tasks
     */
    getTasks(): EnrichedTask[] {
        if (!this.data.tasks) return []

        const recentThreshold = new Date(new Date().getTime() - 5 * 60 * 1000)

        const mappedTasks = this.data.tasks
            .filter((task) => {
                if (task.status === 'needsAction') return true
                if (task.status === 'completed' && task.completed) {
                    const completedAt = new Date(task.completed)
                    return completedAt > recentThreshold
                }
                return false
            })
            .map((task): EnrichedTask => {
                let dueDate: Date | null = null

                if (task.due) {
                    const dateOnly = task.due.split('T')[0]
                    dueDate = new Date(dateOnly + 'T23:59:59')
                }

                return {
                    id: task.id,
                    content: task.title,
                    checked: task.status === 'completed',
                    completed_at: task.completed || null,
                    due: task.due ? { date: task.due } : null,
                    due_date: dueDate,
                    has_time: false,
                    project_id: task.tasklistId || null,
                    project_name: task.tasklistName || '',
                    labels: [],
                    label_names: [],
                    child_order: task.position ? parseInt(task.position) : 0,
                    is_deleted: task.deleted || false,
                }
            })

        return TaskBackend.sortTasks(mappedTasks)
    }

    /**
     * Get tasklist name by ID
     */
    getTasklistName(tasklistId: string): string {
        return (
            this.data.tasklists?.find((tl) => tl.id === tasklistId)?.title ?? ''
        )
    }

    /**
     * Add a new task
     */
    async addTask(content: string, due: string | null): Promise<void> {
        try {
            const taskData: { title: string; due?: string } = { title: content }
            if (due) {
                const dateOnly = due.split('T')[0]
                taskData.due = dateOnly + 'T00:00:00.000Z'
            }

            logger.log('Adding task:', { content, due })

            await this.apiRequest<GoogleTask>(
                `/lists/${this.defaultTasklistId}/tasks`,
                {
                    method: 'POST',
                    body: JSON.stringify(taskData),
                }
            )

            logger.log('Task added successfully')
        } catch (error) {
            // Re-throw BackendError instances as-is (from google-auth)
            if (error instanceof AuthError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Failed to add task:', error)
            throw this.wrapError(error, 'Add task', SyncError)
        }
    }

    /**
     * Complete a task
     */
    async completeTask(taskId: string): Promise<void> {
        try {
            const task = this.data.tasks?.find((t) => t.id === taskId)
            const tasklistId = task?.tasklistId ?? this.defaultTasklistId

            logger.log('Completing task:', { taskId })

            await this.apiRequest<GoogleTask>(
                `/lists/${tasklistId}/tasks/${taskId}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'completed',
                        completed: new Date().toISOString(),
                    }),
                }
            )

            logger.log('Task completed successfully')
        } catch (error) {
            // Re-throw BackendError instances as-is (from google-auth)
            if (error instanceof AuthError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Failed to complete task:', error)
            throw this.wrapError(error, 'Complete task', SyncError)
        }
    }

    /**
     * Uncomplete a task
     */
    async uncompleteTask(taskId: string): Promise<void> {
        try {
            const task = this.data.tasks?.find((t) => t.id === taskId)
            const tasklistId = task?.tasklistId ?? this.defaultTasklistId

            logger.log('Uncompleting task:', { taskId })

            await this.apiRequest<GoogleTask>(
                `/lists/${tasklistId}/tasks/${taskId}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'needsAction',
                        completed: null,
                    }),
                }
            )

            logger.log('Task uncompleted successfully')
        } catch (error) {
            // Re-throw BackendError instances as-is (from google-auth)
            if (error instanceof AuthError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Failed to uncomplete task:', error)
            throw this.wrapError(error, 'Uncomplete task', SyncError)
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<void> {
        try {
            const task = this.data.tasks?.find((t) => t.id === taskId)
            const tasklistId = task?.tasklistId ?? this.defaultTasklistId

            logger.log('Deleting task:', { taskId })

            await this.apiRequest<void>(`/lists/${tasklistId}/tasks/${taskId}`, {
                method: 'DELETE',
            })

            logger.log('Task deleted successfully')
        } catch (error) {
            // Re-throw BackendError instances as-is (from google-auth)
            if (error instanceof AuthError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Failed to delete task:', error)
            throw this.wrapError(error, 'Delete task', SyncError)
        }
    }

    /**
     * Clear local storage
     */
    clearLocalData(): void {
        localStorage.removeItem(this.dataKey)
        localStorage.removeItem(this.tasklistIdKey)
        this.data = { tasklists: [], tasks: [] }
        this.defaultTasklistId = '@default'
    }
}

export default GoogleTasksBackend

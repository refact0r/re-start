import TaskBackend from './task-backend.js'
import * as googleAuth from './google-auth.js'

/**
 * Google Tasks API client for Web Applications
 * Uses shared Google OAuth module for authentication
 */
class GoogleTasksBackend extends TaskBackend {
    constructor(config = {}) {
        super(config)
        this.baseUrl = 'https://tasks.googleapis.com/tasks/v1'

        this.dataKey = 'google_tasks_data'
        this.tasklistIdKey = 'google_tasks_default_list'
        this.cacheExpiry = 5 * 60 * 1000 // 5 minutes

        // Migrate old storage keys if needed
        googleAuth.migrateStorageKeys()

        this.data = JSON.parse(localStorage.getItem(this.dataKey) ?? '{}')
        this.defaultTasklistId = localStorage.getItem(this.tasklistIdKey) ?? '@default'
    }

    /**
     * Check if cache is stale
     */
    isCacheStale() {
        if (!this.data.timestamp) return true
        return Date.now() - this.data.timestamp >= this.cacheExpiry
    }

    /**
     * Sign in using Google OAuth
     */
    async signIn() {
        return googleAuth.signIn()
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return googleAuth.getUserEmail()
    }

    /**
     * Sign out
     */
    async signOut() {
        googleAuth.signOut()
        this.clearLocalData()
    }

    /**
     * Check if signed in
     */
    getIsSignedIn() {
        return googleAuth.isSignedIn()
    }

    /**
     * Make an authenticated API request with auto-refresh
     */
    async apiRequest(endpoint, options = {}) {
        const accessToken = await googleAuth.ensureValidToken()

        const url = `${this.baseUrl}${endpoint}`
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication expired. Please sign in again.')
            }
            throw new Error(
                `API request failed: ${response.status} ${response.statusText}`
            )
        }

        return response.json()
    }

    /**
     * Sync tasks from Google Tasks API
     */
    async sync(resourceTypes = ['tasklists', 'tasks']) {
        if (!this.getIsSignedIn()) {
            throw new Error('Not signed in to Google account')
        }

        try {
            if (resourceTypes.includes('tasklists')) {
                const data = await this.apiRequest('/users/@me/lists?maxResults=20')
                this.data.tasklists = data.items || []

                const hasValidTasklist = this.data.tasklists.some(
                    (tl) => tl.id === this.defaultTasklistId
                )
                if (!this.defaultTasklistId || !hasValidTasklist) {
                    this.defaultTasklistId = this.data.tasklists[0]?.id ?? '@default'
                    localStorage.setItem(this.tasklistIdKey, this.defaultTasklistId)
                }
            }

            if (resourceTypes.includes('tasks')) {
                const tasklists = this.data.tasklists || []

                if (tasklists.length === 0) {
                    this.data.tasks = []
                } else {
                    const taskPromises = tasklists.map(async (tasklist) => {
                        const data = await this.apiRequest(
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

            return this.data
        } catch (error) {
            console.error('Google Tasks sync error:', error)
            throw error
        }
    }

    /**
     * Get upcoming tasks and recently completed tasks
     */
    getTasks() {
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
            .map((task) => {
                let dueDate = null

                if (task.due) {
                    const dateOnly = task.due.split('T')[0]
                    dueDate = new Date(dateOnly + 'T23:59:59')
                }

                return {
                    id: task.id,
                    content: task.title,
                    notes: task.notes || '',
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
                    parent_id: task.parent || null,
                    is_deleted: task.deleted || false,
                }
            })

        return GoogleTasksBackend.sortTasks(mappedTasks)
    }

    /**
     * Sort tasks
     */
    static sortTasks(tasks) {
        return tasks.sort((a, b) => {
            if (a.checked !== b.checked) return a.checked ? 1 : -1

            if (a.checked && a.completed_at && b.completed_at) {
                const diff = new Date(b.completed_at) - new Date(a.completed_at)
                if (diff !== 0) return diff
            }

            if (a.due_date && b.due_date) {
                const diff = a.due_date - b.due_date
                if (diff !== 0) return diff
            }
            if (a.due_date !== b.due_date) return a.due_date ? -1 : 1

            return a.child_order - b.child_order
        })
    }

    /**
     * Get tasklist name by ID
     */
    getTasklistName(tasklistId) {
        return this.data.tasklists?.find((tl) => tl.id === tasklistId)?.title ?? ''
    }

    /**
     * Add a new task
     */
    async addTask(content, due) {
        const taskData = { title: content }
        if (due) {
            const dateOnly = due.split('T')[0]
            taskData.due = dateOnly + 'T00:00:00.000Z'
        }

        const result = await this.apiRequest(
            `/lists/${this.defaultTasklistId}/tasks`,
            {
                method: 'POST',
                body: JSON.stringify(taskData),
            }
        )

        return result
    }

    /**
     * Complete a task
     */
    async completeTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const tasklistId = task?.tasklistId ?? this.defaultTasklistId

        const result = await this.apiRequest(
            `/lists/${tasklistId}/tasks/${taskId}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'completed',
                    completed: new Date().toISOString(),
                }),
            }
        )

        return result
    }

    /**
     * Uncomplete a task
     */
    async uncompleteTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const tasklistId = task?.tasklistId ?? this.defaultTasklistId

        const result = await this.apiRequest(
            `/lists/${tasklistId}/tasks/${taskId}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'needsAction',
                    completed: null,
                }),
            }
        )

        return result
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const tasklistId = task?.tasklistId ?? this.defaultTasklistId

        await this.apiRequest(`/lists/${tasklistId}/tasks/${taskId}`, {
            method: 'DELETE',
        })
    }

    /**
     * Clear local storage
     */
    clearLocalData() {
        localStorage.removeItem(this.dataKey)
        localStorage.removeItem(this.tasklistIdKey)
        this.data = {}
        this.defaultTasklistId = '@default'
    }
}

export default GoogleTasksBackend

import TaskBackend from './task-backend.js'

/**
 * Google Tasks API client for Chrome/Firefox Extensions
 * Uses browser.identity API for secure OAuth
 */
class GoogleTasksBackendExtension extends TaskBackend {
    constructor(config = {}) {
        super(config)
        this.clientId =
            '489393578728-ij3qkagfga69u9vmcdpknn7aqlpb2olr.apps.googleusercontent.com'

        this.scopes = ['https://www.googleapis.com/auth/tasks']
        this.baseUrl = 'https://tasks.googleapis.com/tasks/v1'

        this.dataKey = 'google_tasks_data'
        this.tasklistIdKey = 'google_tasks_default_list'
        this.tokenKey = 'google_tasks_token'
        this.data = JSON.parse(localStorage.getItem(this.dataKey) ?? '{}')
        this.defaultTasklistId =
            localStorage.getItem(this.tasklistIdKey) ?? '@default'
        this.accessToken = localStorage.getItem(this.tokenKey)
        this.isSignedIn = !!this.accessToken
    }

    /**
     * Get Chrome Identity API (works on Firefox too with polyfill)
     */
    getIdentityAPI() {
        // Chrome uses chrome.identity, Firefox uses browser.identity
        return chrome?.identity ?? browser?.identity ?? null
    }

    /**
     * Sign in using browser's OAuth flow
     * This is MORE SECURE - browser handles auth, no credentials in your code!
     */
    async signIn() {
        const identity = this.getIdentityAPI()
        if (!identity) {
            throw new Error(
                'Browser identity API not available. Are you running as an extension?'
            )
        }

        return new Promise((resolve, reject) => {
            const redirectURL = identity.getRedirectURL()
            const authURL = new URL('https://accounts.google.com/o/oauth2/auth')
            authURL.searchParams.set('client_id', this.clientId)
            authURL.searchParams.set('response_type', 'token')
            authURL.searchParams.set('redirect_uri', redirectURL)
            authURL.searchParams.set('scope', this.scopes.join(' '))

            identity.launchWebAuthFlow(
                {
                    url: authURL.href,
                    interactive: true,
                },
                (responseURL) => {
                    // Check for errors (works in both Chrome and Firefox)
                    const runtime = chrome?.runtime ?? browser?.runtime
                    if (runtime?.lastError) {
                        reject(new Error(runtime.lastError.message))
                        return
                    }

                    // Extract access token from response URL
                    const url = new URL(responseURL)
                    const params = new URLSearchParams(url.hash.substring(1))
                    const accessToken = params.get('access_token')

                    if (accessToken) {
                        this.accessToken = accessToken
                        localStorage.setItem(this.tokenKey, accessToken)
                        this.isSignedIn = true
                        resolve(accessToken)
                    } else {
                        reject(new Error('No access token in response'))
                    }
                }
            )
        })
    }

    /**
     * Sign out
     */
    async signOut() {
        this.accessToken = null
        this.isSignedIn = false
        localStorage.removeItem(this.tokenKey)
        this.clearLocalData()
    }

    /**
     * Check if signed in
     */
    getIsSignedIn() {
        return this.isSignedIn
    }

    /**
     * Make an authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error('Not signed in')
        }

        const url = `${this.baseUrl}${endpoint}`
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            // Token might be expired, try to refresh by signing in again
            if (response.status === 401) {
                this.accessToken = null
                this.isSignedIn = false
                localStorage.removeItem(this.tokenKey)
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
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google account')
        }

        try {
            // Get task lists
            if (resourceTypes.includes('tasklists')) {
                const data = await this.apiRequest(
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

            // Get tasks from all lists in parallel
            if (resourceTypes.includes('tasks')) {
                // Only fetch completed tasks from the last 24 hours to avoid hitting the 100-task limit
                const completedMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

                const taskPromises = this.data.tasklists.map(
                    async (tasklist) => {
                        const data = await this.apiRequest(
                            `/lists/${tasklist.id}/tasks?showCompleted=true&showHidden=true&showAssigned=true&maxResults=100&completedMin=${encodeURIComponent(completedMin)}`
                        )
                        // Add tasklist info to each task
                        return (data.items || []).map((task) => ({
                            ...task,
                            tasklistId: tasklist.id,
                            tasklistName: tasklist.title,
                        }))
                    }
                )

                const taskArrays = await Promise.all(taskPromises)
                this.data.tasks = taskArrays.flat()
            }

            localStorage.setItem(this.dataKey, JSON.stringify(this.data))
            console.log('Google Tasks sync complete:', this.data)

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
                    // Google Tasks API only stores dates, not times
                    // Extract date portion to avoid timezone conversion issues
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

        return GoogleTasksBackendExtension.sortTasks(mappedTasks)
    }

    /**
     * Sort tasks
     */
    static sortTasks(tasks) {
        return tasks.sort((a, b) => {
            // Sort by completion status first
            if (a.checked !== b.checked) return a.checked ? 1 : -1

            // Sort completed tasks by completion time (most recent first)
            if (a.checked && a.completed_at && b.completed_at) {
                const diff = new Date(b.completed_at) - new Date(a.completed_at)
                if (diff !== 0) return diff
            }

            // Sort by due date (tasks with no due date go last)
            if (a.due_date && b.due_date) {
                const diff = a.due_date - b.due_date
                if (diff !== 0) return diff
            }
            if (a.due_date !== b.due_date) return a.due_date ? -1 : 1

            // Finally sort by position
            return a.child_order - b.child_order
        })
    }

    /**
     * Get tasklist name by ID
     */
    getTasklistName(tasklistId) {
        return (
            this.data.tasklists?.find((tl) => tl.id === tasklistId)?.title ?? ''
        )
    }

    /**
     * Add a new task
     * Note: Google Tasks API only supports dates, not times
     */
    async addTask(content, due) {
        const taskData = { title: content }
        if (due) {
            // Google Tasks only supports date (YYYY-MM-DD), strip time if present
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

export default GoogleTasksBackendExtension

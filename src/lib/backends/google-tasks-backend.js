import TaskBackend from './task-backend.js'

/**
 * Google Tasks API client for Web Applications
 * Uses OAuth 2.0 implicit flow (no backend/client_secret required)
 *
 * NOTE: You need to configure a Web Application OAuth client in Google Cloud Console:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create OAuth 2.0 Client ID with type "Web application"
 * 3. Add your origin to "Authorized JavaScript origins" (e.g., http://localhost:5173)
 * 4. Update the clientId below
 */
class GoogleTasksBackend extends TaskBackend {
    constructor(config = {}) {
        super(config)
        // Web application client ID
        this.clientId = config.clientId || '317653837986-8hsogqkfab632ducq6k0jcpngn1iub6a.apps.googleusercontent.com'

        this.scopes = [
            'https://www.googleapis.com/auth/tasks',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
        this.baseUrl = 'https://tasks.googleapis.com/tasks/v1'

        this.dataKey = 'google_tasks_data'
        this.tasklistIdKey = 'google_tasks_default_list'
        this.tokenKey = 'google_tasks_token'
        this.tokenExpiryKey = 'google_tasks_token_expiry'
        this.userEmailKey = 'google_user_email'

        this.data = JSON.parse(localStorage.getItem(this.dataKey) ?? '{}')
        this.defaultTasklistId = localStorage.getItem(this.tasklistIdKey) ?? '@default'
        this.accessToken = localStorage.getItem(this.tokenKey)
        this.tokenExpiry = localStorage.getItem(this.tokenExpiryKey)
        this.userEmail = localStorage.getItem(this.userEmailKey)
        this.isSignedIn = !!this.accessToken && !this.isTokenExpired()
    }

    /**
     * Check if current token is expired
     */
    isTokenExpired() {
        if (!this.tokenExpiry) return true
        return Date.now() > parseInt(this.tokenExpiry, 10)
    }

    /**
     * Sign in using popup-based OAuth implicit flow
     * Returns access token directly - no backend needed
     */
    async signIn() {
        const state = crypto.randomUUID()
        sessionStorage.setItem('oauth_state', state)

        const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        authURL.searchParams.set('client_id', this.clientId)
        // Get the base path from current location (handles subdirectory deployments)
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '')
        authURL.searchParams.set('redirect_uri', `${window.location.origin}${basePath}/oauth-callback.html`)
        authURL.searchParams.set('response_type', 'token')
        authURL.searchParams.set('scope', this.scopes.join(' '))
        authURL.searchParams.set('state', state)
        authURL.searchParams.set('include_granted_scopes', 'true')

        return new Promise((resolve, reject) => {
            const width = 500
            const height = 600
            const left = window.screenX + (window.outerWidth - width) / 2
            const top = window.screenY + (window.outerHeight - height) / 2

            const popup = window.open(
                authURL.href,
                'Google Sign In',
                `width=${width},height=${height},left=${left},top=${top},popup=1`
            )

            if (!popup) {
                reject(new Error('Popup blocked. Please allow popups for this site.'))
                return
            }

            // Listen for message from callback page
            const handleMessage = async (event) => {
                if (event.origin !== window.location.origin) return

                if (event.data?.type === 'oauth-callback') {
                    window.removeEventListener('message', handleMessage)
                    popup.close()

                    if (event.data.error) {
                        reject(new Error(event.data.error_description || event.data.error))
                        return
                    }

                    const { access_token, expires_in, state: returnedState } = event.data
                    const savedState = sessionStorage.getItem('oauth_state')

                    // Clean up
                    sessionStorage.removeItem('oauth_state')

                    if (returnedState !== savedState) {
                        reject(new Error('State mismatch - possible CSRF attack'))
                        return
                    }

                    if (!access_token) {
                        reject(new Error('No access token received'))
                        return
                    }

                    // Store the token
                    this.accessToken = access_token
                    this.isSignedIn = true

                    // Calculate and store expiry time (default 1 hour if not provided)
                    const expiresInMs = (parseInt(expires_in, 10) || 3600) * 1000
                    const expiryTime = Date.now() + expiresInMs
                    this.tokenExpiry = expiryTime.toString()

                    localStorage.setItem(this.tokenKey, this.accessToken)
                    localStorage.setItem(this.tokenExpiryKey, this.tokenExpiry)

                    // Fetch user email
                    this.fetchUserEmail().catch(console.error)

                    resolve(this.accessToken)
                }
            }

            window.addEventListener('message', handleMessage)

            // Check if popup was closed without completing auth
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed)
                    window.removeEventListener('message', handleMessage)
                    sessionStorage.removeItem('oauth_state')
                    reject(new Error('Sign in cancelled'))
                }
            }, 500)
        })
    }

    /**
     * Fetch user email from Google userinfo endpoint
     */
    async fetchUserEmail() {
        if (!this.accessToken) return null

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            })

            if (!response.ok) {
                console.error('Failed to fetch user email:', response.status)
                return null
            }

            const data = await response.json()
            this.userEmail = data.email
            localStorage.setItem(this.userEmailKey, this.userEmail)
            return this.userEmail
        } catch (error) {
            console.error('Error fetching user email:', error)
            return null
        }
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return this.userEmail
    }

    /**
     * Sign out
     */
    async signOut() {
        this.accessToken = null
        this.isSignedIn = false
        this.tokenExpiry = null
        this.userEmail = null
        localStorage.removeItem(this.tokenKey)
        localStorage.removeItem(this.tokenExpiryKey)
        localStorage.removeItem(this.userEmailKey)
        this.clearLocalData()
    }

    /**
     * Check if signed in
     */
    getIsSignedIn() {
        // Re-check token expiry
        if (this.accessToken && this.isTokenExpired()) {
            this.isSignedIn = false
        }
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
            if (response.status === 401) {
                this.accessToken = null
                this.isSignedIn = false
                localStorage.removeItem(this.tokenKey)
                localStorage.removeItem(this.tokenExpiryKey)
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

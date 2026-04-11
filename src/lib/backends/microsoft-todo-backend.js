import TaskBackend from './task-backend.js'
import { isChrome } from '../utils/browser-detect.js'

const MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
const MS_SCOPE = 'openid profile offline_access Tasks.ReadWrite'

function toBase64Url(bytes) {
    const str = btoa(String.fromCharCode(...bytes))
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return toBase64Url(new Uint8Array(digest))
}

function makeCodeVerifier() {
    const bytes = crypto.getRandomValues(new Uint8Array(64))
    return toBase64Url(bytes)
}

function makeState() {
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    return toBase64Url(bytes)
}

function parseDueDate(dueDateTime) {
    if (!dueDateTime?.dateTime) {
        return { due: null, dueDate: null, hasTime: false }
    }

    const rawDateTime = dueDateTime.dateTime
    const dateOnly = rawDateTime.split('T')[0]
    const midnightPattern = /T00:00(?::00(?:\.0+)?)?$/
    const hasTime = !midnightPattern.test(rawDateTime)

    if (!hasTime) {
        return {
            due: { date: dateOnly },
            dueDate: new Date(`${dateOnly}T23:59:59`),
            hasTime: false,
        }
    }

    const source =
        dueDateTime.timeZone === 'UTC' ? `${rawDateTime}Z` : rawDateTime
    const parsed = new Date(source)
    if (Number.isNaN(parsed.getTime())) {
        return { due: null, dueDate: null, hasTime: false }
    }

    return {
        due: { date: rawDateTime },
        dueDate: parsed,
        hasTime: true,
    }
}

export function mapMicrosoftTask(task, listName = '', order = 0) {
    const due = parseDueDate(task.dueDateTime)
    return {
        id: task.id,
        content: task.title || '',
        checked: task.status === 'completed',
        completed_at: task.completedDateTime?.dateTime
            ? task.completedDateTime.dateTime.endsWith('Z')
                ? task.completedDateTime.dateTime
                : `${task.completedDateTime.dateTime}Z`
            : null,
        due: due.due,
        due_date: due.dueDate,
        has_time: due.hasTime,
        project_id: task.listId || null,
        project_name: listName,
        labels: [],
        label_names: [],
        child_order: order,
        is_deleted: false,
    }
}

export function normalizeDueForGraph(due) {
    if (!due) return null

    if (due.includes('T')) {
        const localDate = new Date(due)
        if (Number.isNaN(localDate.getTime())) return null
        const utcDateTime = localDate.toISOString().replace(/\.\d{3}Z$/, '')
        return {
            dateTime: utcDateTime,
            timeZone: 'UTC',
        }
    }

    return {
        dateTime: `${due}T00:00:00`,
        timeZone: 'UTC',
    }
}

class MicrosoftTodoBackend extends TaskBackend {
    constructor(config = {}) {
        super(config)
        this.baseUrl = MS_GRAPH_BASE_URL
        this.scope = MS_SCOPE
        this.clientId = config.clientId || ''
        this.tenant = config.tenant || 'common'

        this.dataKey = 'microsoft_todo_data'
        this.defaultListIdKey = 'microsoft_todo_default_list'
        this.refreshTokenKey = 'microsoft_todo_refresh_token'
        this.data = JSON.parse(localStorage.getItem(this.dataKey) ?? '{}')
        this.defaultListId = localStorage.getItem(this.defaultListIdKey) ?? ''
        this.refreshToken = localStorage.getItem(this.refreshTokenKey) ?? null
        this.accessToken = null
        this.accessTokenExpiresAt = 0
        this.tokenPromise = null
    }

    get authorizeUrl() {
        return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize`
    }

    get tokenUrl() {
        return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`
    }

    assertAuthAvailable() {
        if (!isChrome()) {
            throw new Error(
                'Chrome identity API not available. Microsoft To Do only works in Chrome.'
            )
        }
        if (!this.clientId) {
            throw new Error('Microsoft client ID is required.')
        }
    }

    async launchAuthFlow(url, interactive) {
        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                { url, interactive },
                (responseUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message))
                        return
                    }

                    if (!responseUrl) {
                        reject(new Error('Authentication canceled'))
                        return
                    }

                    resolve(responseUrl)
                }
            )
        })
    }

    async signIn() {
        this.assertAuthAvailable()

        const redirectUri = chrome.identity.getRedirectURL('microsoft')
        const state = makeState()
        const codeVerifier = makeCodeVerifier()
        const codeChallenge = await generateCodeChallenge(codeVerifier)

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            response_mode: 'query',
            scope: this.scope,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state,
            prompt: 'select_account',
        })

        const authUrl = `${this.authorizeUrl}?${params.toString()}`
        const callbackUrl = await this.launchAuthFlow(authUrl, true)
        const callback = new URL(callbackUrl)

        if (callback.searchParams.get('state') !== state) {
            throw new Error('Invalid authentication state')
        }

        const code = callback.searchParams.get('code')
        if (!code) {
            throw new Error('No authorization code received')
        }

        await this.exchangeCodeForToken(code, codeVerifier, redirectUri)
        return this.accessToken
    }

    async exchangeCodeForToken(code, codeVerifier, redirectUri) {
        const body = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            scope: this.scope,
        })

        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        })

        if (!response.ok) {
            throw new Error(`Microsoft token exchange failed: ${response.status}`)
        }

        const tokenData = await response.json()
        this.setTokenData(tokenData)
    }

    setTokenData(tokenData) {
        this.accessToken = tokenData.access_token || null
        const expiresIn = Number(tokenData.expires_in || 3600)
        this.accessTokenExpiresAt = Date.now() + (expiresIn - 60) * 1000

        if (tokenData.refresh_token) {
            this.refreshToken = tokenData.refresh_token
            localStorage.setItem(this.refreshTokenKey, this.refreshToken)
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available')
        }

        const redirectUri = chrome.identity.getRedirectURL('microsoft')
        const body = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken,
            redirect_uri: redirectUri,
            scope: this.scope,
        })

        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        })

        if (!response.ok) {
            // Clear all local auth state so the UI treats this as an expired sign-in.
            this.accessToken = null
            this.accessTokenExpiresAt = null
            this.refreshToken = null
            localStorage.removeItem(this.refreshTokenKey)
            throw new Error('Authentication expired. Please sign in again.')
        }

        const tokenData = await response.json()
        this.setTokenData(tokenData)
        return this.accessToken
    }

    async getAccessToken(interactive = false) {
        this.assertAuthAvailable()

        if (this.tokenPromise) {
            return this.tokenPromise
        }

        this.tokenPromise = (async () => {
            if (
                this.accessToken &&
                this.accessTokenExpiresAt &&
                Date.now() < this.accessTokenExpiresAt
            ) {
                return this.accessToken
            }

            if (this.refreshToken) {
                return this.refreshAccessToken()
            }

            if (interactive) {
                await this.signIn()
                return this.accessToken
            }

            throw new Error('Authentication expired. Please sign in again.')
        })()

        try {
            return await this.tokenPromise
        } finally {
            this.tokenPromise = null
        }
    }

    async signOut() {
        this.accessToken = null
        this.accessTokenExpiresAt = 0
        this.refreshToken = null
        this.clearLocalData()
    }

    async apiRequest(endpoint, options = {}) {
        let token = await this.getAccessToken(false)
        const url = endpoint.startsWith('http')
            ? endpoint
            : `${this.baseUrl}${endpoint}`

        const makeRequest = async (accessToken) =>
            fetch(url, {
                ...options,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            })

        let response = await makeRequest(token)

        if (response.status === 401) {
            token = await this.refreshAccessToken()
            response = await makeRequest(token)
        }

        if (!response.ok) {
            throw new Error(
                `Microsoft Graph request failed: ${response.status} ${response.statusText}`
            )
        }

        if (
            response.status === 204 ||
            response.headers.get('content-length') === '0'
        ) {
            return null
        }

        return response.json()
    }

    async getAllPages(endpoint) {
        let nextUrl = `${this.baseUrl}${endpoint}`
        const items = []

        while (nextUrl) {
            const data = await this.apiRequest(nextUrl)
            items.push(...(data.value || []))
            nextUrl = data['@odata.nextLink'] || null
        }

        return items
    }

    async sync(resourceTypes = ['lists', 'tasks']) {
        try {
            let newLists = this.data.lists || []
            let newTasks = this.data.tasks || []

            if (resourceTypes.includes('lists')) {
                newLists = await this.getAllPages('/me/todo/lists')

                const hasValidList = newLists.some(
                    (list) => list.id === this.defaultListId
                )
                if (!this.defaultListId || !hasValidList) {
                    this.defaultListId = newLists[0]?.id || ''
                    localStorage.setItem(this.defaultListIdKey, this.defaultListId)
                }
            }

            if (resourceTypes.includes('tasks')) {
                const taskPromises = newLists.map(async (list) => {
                    const listTasks = await this.getAllPages(
                        `/me/todo/lists/${list.id}/tasks`
                    )
                    return listTasks.map((task, index) => ({
                        ...task,
                        listId: list.id,
                        listName: list.displayName,
                        orderIndex: index,
                    }))
                })
                const taskArrays = await Promise.all(taskPromises)
                newTasks = taskArrays.flat()
            }

            this.data = {
                lists: newLists,
                tasks: newTasks,
            }
            localStorage.setItem(this.dataKey, JSON.stringify(this.data))
            return this.data
        } catch (error) {
            if (error.message?.includes('Authentication expired')) {
                this.clearLocalData()
            }
            throw error
        }
    }

    getTasks() {
        if (!this.data.tasks) return []
        const recentThreshold = new Date(Date.now() - 5 * 60 * 1000)

        const mappedTasks = this.data.tasks
            .filter((task) => {
                if (task.status !== 'completed') return true
                if (!task.completedDateTime?.dateTime) return false
                const dateTimeStr = task.completedDateTime.dateTime
                const hasTimezone =
                    /Z$/.test(dateTimeStr) || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)
                const isoString = hasTimezone ? dateTimeStr : `${dateTimeStr}Z`
                const completedAt = new Date(isoString)
                return completedAt > recentThreshold
            })
            .map((task) =>
                mapMicrosoftTask(task, task.listName || '', task.orderIndex ?? 0)
            )

        return MicrosoftTodoBackend.sortTasks(mappedTasks)
    }

    static sortTasks(tasks) {
        return tasks.sort((a, b) => {
            if (a.checked !== b.checked) return a.checked ? 1 : -1

            if (a.checked && a.completed_at && b.completed_at) {
                const diff =
                    new Date(b.completed_at).getTime() -
                    new Date(a.completed_at).getTime()
                if (diff !== 0) return diff
            }

            if (!a.due_date && b.due_date) return 1
            if (a.due_date && !b.due_date) return -1

            if (a.due_date && b.due_date) {
                const diff = a.due_date.getTime() - b.due_date.getTime()
                if (diff !== 0) return diff
            }

            return (a.child_order ?? 0) - (b.child_order ?? 0)
        })
    }

    async addTask(content, due, listId) {
        const targetListId = listId || this.defaultListId
        if (!targetListId) {
            throw new Error('No Microsoft To Do list available')
        }

        const taskData = { title: content }
        const dueDateTime = normalizeDueForGraph(due)
        if (dueDateTime) taskData.dueDateTime = dueDateTime

        return this.apiRequest(`/me/todo/lists/${targetListId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(taskData),
        })
    }

    async completeTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const listId = task?.listId || this.defaultListId
        const completedDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, '')

        return this.apiRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: 'completed',
                completedDateTime: {
                    dateTime: completedDateTime,
                    timeZone: 'UTC',
                },
            }),
        })
    }

    async uncompleteTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const listId = task?.listId || this.defaultListId

        return this.apiRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: 'notStarted',
                completedDateTime: null,
            }),
        })
    }

    async editTaskName(taskId, newContent) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const listId = task?.listId || this.defaultListId

        return this.apiRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: newContent }),
        })
    }

    async deleteTask(taskId) {
        const task = this.data.tasks?.find((t) => t.id === taskId)
        const listId = task?.listId || this.defaultListId
        return this.apiRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'DELETE',
        })
    }

    clearLocalData() {
        localStorage.removeItem(this.dataKey)
        localStorage.removeItem(this.defaultListIdKey)
        localStorage.removeItem(this.refreshTokenKey)
        this.data = {}
        this.defaultListId = ''
        this.accessToken = null
        this.accessTokenExpiresAt = 0
    }
}

export default MicrosoftTodoBackend

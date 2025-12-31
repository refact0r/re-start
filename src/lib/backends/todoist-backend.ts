import TaskBackend from './task-backend'
import type { TaskBackendConfig, EnrichedTask, TaskDue } from '../types'
import { generateUUID } from '../uuid'

interface TodoistItem {
    id: string
    content: string
    checked: boolean
    completed_at: string | null
    due: TaskDue | null
    project_id: string | null
    labels: string[]
    child_order: number
    is_deleted?: boolean
}

interface TodoistLabel {
    id: string
    name: string
}

interface TodoistProject {
    id: string
    name: string
}

interface TodoistData {
    items: TodoistItem[]
    labels: TodoistLabel[]
    projects: TodoistProject[]
    timestamp?: number
}

interface TodoistSyncResponse {
    sync_token: string
    full_sync?: boolean
    items?: TodoistItem[]
    labels?: TodoistLabel[]
    projects?: TodoistProject[]
}

interface TodoistCommand {
    type: string
    uuid: string
    temp_id?: string
    args: Record<string, unknown>
}

/**
 * Todoist API client using the Sync endpoint for efficient data retrieval
 */
class TodoistBackend extends TaskBackend {
    private token: string
    private baseUrl: string
    private syncTokenKey: string
    private dataKey: string
    private syncToken: string
    protected override data: TodoistData
    protected override cacheExpiry: number

    constructor(config: TaskBackendConfig) {
        super(config)
        this.token = config.apiToken || ''
        this.baseUrl = 'https://api.todoist.com/api/v1'
        this.syncTokenKey = 'todoist_sync_token'
        this.dataKey = 'todoist_data'
        this.cacheExpiry = 5 * 60 * 1000 // 5 minutes

        this.syncToken = localStorage.getItem(this.syncTokenKey) || '*'
        this.data = JSON.parse(localStorage.getItem(this.dataKey) || '{}') as TodoistData
        if (!this.data.items) this.data.items = []
        if (!this.data.labels) this.data.labels = []
        if (!this.data.projects) this.data.projects = []
    }

    /**
     * Perform a sync request to get tasks and related data
     */
    async sync(
        resourceTypes: string[] = ['items', 'labels', 'projects'],
        isRetry = false
    ): Promise<TodoistSyncResponse> {
        const formData = new FormData()
        formData.append('sync_token', this.syncToken)
        formData.append('resource_types', JSON.stringify(resourceTypes))

        try {
            const response = await fetch(`${this.baseUrl}/sync`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`todoist fetch failed: ${response.status}`)
            }

            const data = await response.json() as TodoistSyncResponse

            this.updateLocalData(data)

            this.syncToken = data.sync_token
            localStorage.setItem(this.syncTokenKey, this.syncToken)

            return data
        } catch (error) {
            if (!isRetry && this.syncToken !== '*') {
                this.syncToken = '*'
                localStorage.setItem(this.syncTokenKey, this.syncToken)
                return this.sync(resourceTypes, true)
            }
            throw error
        }
    }

    /**
     * Update local data storage with sync response
     */
    private updateLocalData(syncData: TodoistSyncResponse): void {
        if (syncData.full_sync) {
            this.data = {
                items: syncData.items || [],
                labels: syncData.labels || [],
                projects: syncData.projects || [],
            }
        } else {
            // Merge incremental updates
            this.mergeData('items', syncData.items)
            this.mergeData('labels', syncData.labels)
            this.mergeData('projects', syncData.projects)
        }

        this.data.timestamp = Date.now()
        localStorage.setItem(this.dataKey, JSON.stringify(this.data))
    }

    /**
     * Generic merge function for all data types
     */
    private mergeData(type: 'items' | 'labels' | 'projects', newData?: Array<TodoistItem | TodoistLabel | TodoistProject>): void {
        if (!newData) return
        if (!this.data[type]) {
            (this.data[type] as unknown[]) = []
        }

        newData.forEach((newItem) => {
            const isDeleted = 'is_deleted' in newItem && newItem.is_deleted
            if (isDeleted) {
                (this.data[type] as Array<{ id: string }>) = this.data[type].filter(
                    (item) => item.id !== newItem.id
                )
            } else {
                const existingIndex = this.data[type].findIndex(
                    (item) => item.id === newItem.id
                )
                if (existingIndex >= 0) {
                    (this.data[type][existingIndex] as unknown) = newItem
                } else {
                    (this.data[type] as unknown[]).push(newItem)
                }
            }
        })
    }

    /**
     * Get upcoming tasks and recently completed tasks
     */
    getTasks(): EnrichedTask[] {
        if (!this.data.items) return []

        const recentThreshold = new Date(new Date().getTime() - 5 * 60 * 1000) // 5 minutes ago

        const mappedTasks = this.data.items
            .filter((item) => {
                if (item.is_deleted) return false

                // Include unchecked tasks
                if (!item.checked) return true

                // Include recently completed tasks (within last 5 minutes)
                if (item.checked && item.completed_at) {
                    const completedAt = new Date(item.completed_at)
                    return completedAt > recentThreshold
                }

                return false
            })
            .map((item): EnrichedTask => {
                let dueDate: Date | null = null
                let hasTime = false

                if (item.due) {
                    if (item.due.date.includes('T')) {
                        dueDate = new Date(item.due.date)
                        hasTime = true
                    } else {
                        // offset to 23:59:59 if no time is provided
                        dueDate = new Date(item.due.date + 'T23:59:59')
                    }
                }

                return {
                    ...item,
                    project_name: this.getProjectName(item.project_id || ''),
                    label_names: this.getLabelNames(item.labels),
                    due_date: dueDate,
                    has_time: hasTime,
                }
            })

        return TaskBackend.sortTasks(mappedTasks)
    }

    /**
     * Get project name by ID
     */
    override getProjectName(projectId: string): string {
        return this.data.projects?.find((p) => p.id === projectId)?.name || ''
    }

    /**
     * Get label names by label IDs
     */
    override getLabelNames(labelIds: string[]): string[] {
        if (!labelIds || !this.data.labels) return []
        return labelIds
            .map((id) => this.data.labels.find((l) => l.id === id)?.name)
            .filter((name): name is string => Boolean(name))
    }

    /**
     * Complete a task
     */
    async completeTask(taskId: string): Promise<void> {
        const commands: TodoistCommand[] = [
            {
                type: 'item_close',
                uuid: generateUUID(),
                args: {
                    id: taskId,
                },
            },
        ]

        await this.executeCommands(commands)
    }

    /**
     * Uncomplete a task (undo completion)
     */
    async uncompleteTask(taskId: string): Promise<void> {
        const commands: TodoistCommand[] = [
            {
                type: 'item_uncomplete',
                uuid: generateUUID(),
                args: {
                    id: taskId,
                },
            },
        ]

        await this.executeCommands(commands)
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<void> {
        const commands: TodoistCommand[] = [
            {
                type: 'item_delete',
                uuid: generateUUID(),
                args: {
                    id: taskId,
                },
            },
        ]

        await this.executeCommands(commands)
    }

    /**
     * Add a new task
     */
    async addTask(content: string, due: string | null): Promise<void> {
        const tempId = generateUUID()
        const args: Record<string, unknown> = { content }
        if (due) {
            args.due = { date: due }
        }

        const commands: TodoistCommand[] = [
            {
                type: 'item_add',
                temp_id: tempId,
                uuid: generateUUID(),
                args,
            },
        ]

        await this.executeCommands(commands)
    }

    /**
     * Execute sync commands
     */
    private async executeCommands(commands: TodoistCommand[]): Promise<unknown> {
        const formData = new FormData()
        formData.append('commands', JSON.stringify(commands))

        const response = await fetch(`${this.baseUrl}/sync`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`todoist command fetch failed: ${response.status}`)
        }

        return response.json()
    }

    /**
     * Clear local storage when the API token changes
     */
    clearLocalData(): void {
        localStorage.removeItem(this.syncTokenKey)
        localStorage.removeItem(this.dataKey)
        this.syncToken = '*'
        this.data = { items: [], labels: [], projects: [] }
    }
}

export default TodoistBackend

/**
 * Todoist API client using the Sync endpoint for efficient data retrieval
 */
class TodoistAPI {
    constructor(token) {
        this.token = token
        this.baseUrl = 'https://api.todoist.com/api/v1'
        this.syncTokenKey = 'todoist_sync_token'
        this.dataKey = 'todoist_data'

        this.syncToken = localStorage.getItem(this.syncTokenKey) || '*'
        this.data = JSON.parse(localStorage.getItem(this.dataKey) || '{}')
    }

    /**
     * Perform a sync request to get tasks and related data
     */
    async sync(
        resourceTypes = ['items', 'labels', 'projects'],
        isRetry = false
    ) {
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

            const data = await response.json()

            this.updateLocalData(data)

            this.syncToken = data.sync_token
            localStorage.setItem(this.syncTokenKey, this.syncToken)

            console.log(data)

            return data
        } catch (error) {
            if (!isRetry && this.syncToken !== '*') {
                console.log('retrying with full sync...')
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
    updateLocalData(syncData) {
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

        localStorage.setItem(this.dataKey, JSON.stringify(this.data))
    }

    /**
     * Generic merge function for all data types
     */
    mergeData(type, newData) {
        if (!newData) return
        if (!this.data[type]) this.data[type] = []

        newData.forEach((newItem) => {
            if (newItem.is_deleted) {
                this.data[type] = this.data[type].filter(
                    (item) => item.id !== newItem.id
                )
            } else {
                const existingIndex = this.data[type].findIndex(
                    (item) => item.id === newItem.id
                )
                if (existingIndex >= 0) {
                    this.data[type][existingIndex] = newItem
                } else {
                    this.data[type].push(newItem)
                }
            }
        })
    }

    /**
     * Get upcoming tasks and recently completed tasks
     */
    getTasks() {
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
            .map((item) => {
                let dueDate = null
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
                    project_name: this.getProjectName(item.project_id),
                    label_names: this.getLabelNames(item.labels),
                    due_date: dueDate,
                    has_time: hasTime,
                }
            })

        return TodoistAPI.sortTasks(mappedTasks)
    }

    /**
     * Static method to sort tasks
     */
    static sortTasks(tasks) {
        return tasks.sort((a, b) => {
            // Unchecked tasks first
            if (a.checked !== b.checked) return a.checked ? 1 : -1

            // Checked tasks: sort by completed_at (recent first), fallback to due date, then child_order
            if (a.checked) {
                if (a.completed_at && b.completed_at) {
                    const diff =
                        new Date(b.completed_at).getTime() -
                        new Date(a.completed_at).getTime()
                    if (diff !== 0) return diff
                }
            }

            // Unchecked tasks with due dates first
            if (!a.due_date && b.due_date) return 1
            if (a.due_date && !b.due_date) return -1

            // Unchecked tasks with due date: sort by due date, fallback to child order
            if (a.due_date !== null) {
                const diff = a.due_date.getTime() - b.due_date.getTime()
                if (diff !== 0) return diff
            }

            return a.child_order - b.child_order
        })
    }

    /**
     * Get project name by ID
     */
    getProjectName(projectId) {
        return this.data.projects?.find((p) => p.id === projectId)?.name || ''
    }

    /**
     * Get label names by label IDs
     */
    getLabelNames(labelIds) {
        if (!labelIds || !this.data.labels) return []
        return labelIds
            .map((id) => this.data.labels.find((l) => l.id === id)?.name)
            .filter(Boolean)
    }

    /**
     * Complete a task
     */
    async completeTask(taskId) {
        const commands = [
            {
                type: 'item_close',
                uuid: crypto.randomUUID(),
                args: {
                    id: taskId,
                },
            },
        ]

        return this.executeCommands(commands)
    }

    /**
     * Uncomplete a task (undo completion)
     */
    async uncompleteTask(taskId) {
        const commands = [
            {
                type: 'item_uncomplete',
                uuid: crypto.randomUUID(),
                args: {
                    id: taskId,
                },
            },
        ]

        return this.executeCommands(commands)
    }

    /**
     * Execute sync commands
     */
    async executeCommands(commands) {
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

        const data = await response.json()

        console.log(data)

        return data
    }

    /**
     * Clear local storage when the API token changes
     */
    clearLocalData() {
        localStorage.removeItem(this.syncTokenKey)
        localStorage.removeItem(this.dataKey)
        this.syncToken = '*'
        this.data = {}
    }
}

export default TodoistAPI

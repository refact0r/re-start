import TaskBackend from './task-backend.js'

/**
 * LocalStorage-based task backend for offline task management
 */
class LocalStorageBackend extends TaskBackend {
    constructor(config) {
        super(config)
        this.dataKey = 'local_tasks'
        this.data = this.loadData()
    }

    /**
     * Load tasks from localStorage
     */
    loadData() {
        const stored = localStorage.getItem(this.dataKey)
        if (!stored) {
            return { items: [] }
        }
        try {
            return JSON.parse(stored)
        } catch (error) {
            console.error('Failed to parse local tasks:', error)
            return { items: [] }
        }
    }

    /**
     * Save tasks to localStorage
     */
    saveData() {
        localStorage.setItem(this.dataKey, JSON.stringify(this.data))
    }

    /**
     * Sync method (no-op for localStorage, but maintains interface)
     */
    async sync(resourceTypes) {
        // LocalStorage doesn't need to sync with a server
        // This method exists to maintain interface compatibility
        return Promise.resolve()
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
                    project_name: '',
                    label_names: [],
                    due_date: dueDate,
                    has_time: hasTime,
                }
            })

        return LocalStorageBackend.sortTasks(mappedTasks)
    }

    /**
     * Static method to sort tasks (same logic as Todoist)
     */
    static sortTasks(tasks) {
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
     * Complete a task
     */
    async completeTask(taskId) {
        const task = this.data.items.find((item) => item.id === taskId)
        if (task) {
            task.checked = true
            task.completed_at = new Date().toISOString()
            this.saveData()
        }
        return Promise.resolve()
    }

    /**
     * Uncomplete a task (undo completion)
     */
    async uncompleteTask(taskId) {
        const task = this.data.items.find((item) => item.id === taskId)
        if (task) {
            task.checked = false
            task.completed_at = null
            this.saveData()
        }
        return Promise.resolve()
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        throw new Error('test error')
        const idx = this.data.items.findIndex((item) => item.id === taskId)
        if (idx !== -1) {
            this.data.items.splice(idx, 1)
            this.saveData()
        }
        return Promise.resolve()
    }

    /**
     * Add a new task
     */
    async addTask(content, due) {
        throw new Error('test error')
        const newTask = {
            id: crypto.randomUUID(),
            content: content,
            checked: false,
            completed_at: null,
            due: due ? { date: due } : null,
            project_id: null,
            labels: [],
            child_order: this.data.items.length,
            is_deleted: false,
        }

        this.data.items.push(newTask)
        this.saveData()
        return Promise.resolve()
    }

    /**
     * Clear local cache (no-op for localStorage backend)
     * Note: Unlike Todoist which clears cache, LocalStorage IS the source of truth.
     * Clearing it would permanently delete user tasks, which is not equivalent behavior.
     * Task deletion should be done explicitly through a separate UI action if needed.
     */
    clearLocalData() {}

    /**
     * Get project name by ID (always empty for localStorage)
     */
    getProjectName(projectId) {
        return ''
    }

    /**
     * Get label names by IDs (always empty for localStorage)
     */
    getLabelNames(labelIds) {
        return []
    }
}

export default LocalStorageBackend

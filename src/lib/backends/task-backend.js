// Base class for task backend implementations
// Defines the interface that all backends must implement

class TaskBackend {
    /**
     * @param {Object} config - Backend-specific configuration
     */
    constructor(config) {
        if (new.target === TaskBackend) {
            throw new Error('TaskBackend is an abstract class')
        }
        this.config = config
    }

    /**
     * Synchronize tasks with the backend
     * @param {string[]} [resourceTypes] - Optional list of resource types to sync
     * @returns {Promise<void>}
     */
    async sync(resourceTypes) {
        throw new Error('sync() must be implemented by subclass')
    }

    /**
     * Get all tasks, filtered and sorted
     * @returns {Array<Object>} Array of task objects with enriched data
     */
    getTasks() {
        throw new Error('getTasks() must be implemented by subclass')
    }

    /**
     * Add a new task
     * @param {string} content - Task content/title
     * @param {string|null} due - Optional due date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
     * @returns {Promise<void>}
     */
    async addTask(content, due) {
        throw new Error('addTask() must be implemented by subclass')
    }

    /**
     * Mark a task as complete
     * @param {string} taskId - ID of the task to complete
     * @returns {Promise<void>}
     */
    async completeTask(taskId) {
        throw new Error('completeTask() must be implemented by subclass')
    }

    /**
     * Mark a task as incomplete
     * @param {string} taskId - ID of the task to uncomplete
     * @returns {Promise<void>}
     */
    async uncompleteTask(taskId) {
        throw new Error('uncompleteTask() must be implemented by subclass')
    }


    /**
     * Sort tasks: unchecked first, then by completion time, due date, project
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
     * Delete a task
     * @param {string} taskId - ID of the task to delete
     * @returns {Promise<void>}
     */
    async deleteTask(taskId) {
        throw new Error('deleteTask() must be implemented by subclass')
    }

    /**
     * Clear all local data/cache
     * @returns {void}
     */
    clearLocalData() {
        throw new Error('clearLocalData() must be implemented by subclass')
    }

    /**
     * Check if cache is stale (default implementation)
     * Subclasses should set this.data.timestamp and this.cacheExpiry
     * @returns {boolean}
     */
    isCacheStale() {
        if (!this.data?.timestamp) return true
        return Date.now() - this.data.timestamp >= (this.cacheExpiry || 0)
    }

    /**
     * Invalidate cache to force fresh sync
     * @returns {void}
     */
    invalidateCache() {
        if (this.data) {
            this.data.timestamp = 0
        }
    }

    /**
     * Get project name by ID
     * @param {string} projectId - Project ID
     * @returns {string} Project name or empty string
     */
    getProjectName(projectId) {
        return ''
    }

    /**
     * Get label names by IDs
     * @param {string[]} labelIds - Array of label IDs
     * @returns {string[]} Array of label names
     */
    getLabelNames(labelIds) {
        return []
    }
}

export default TaskBackend

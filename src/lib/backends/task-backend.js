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

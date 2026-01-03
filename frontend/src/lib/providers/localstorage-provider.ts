import TaskProvider from './task-provider'
import type {
    TaskProviderConfig,
    EnrichedTask,
    RawTask,
    TaskDue,
} from '../types'
import { generateUUID } from '../uuid'
import { createLogger } from '../logger'
import { ValidationError } from '../errors'

interface LocalTaskData {
    items: RawTask[]
    [key: string]: unknown
}

// Logger instance for LocalStorage operations
const logger = createLogger('LocalStorage')

/**
 * LocalStorage-based task backend for offline task management
 */
class LocalStorageProvider extends TaskProvider {
    private dataKey: string
    protected override data: LocalTaskData

    constructor(config: TaskProviderConfig) {
        super(config)
        this.dataKey = 'local_tasks'
        this.data = this.loadData()
    }

    /**
     * Load tasks from localStorage
     * Returns empty data if parsing fails (graceful degradation)
     */
    private loadData(): LocalTaskData {
        const stored = localStorage.getItem(this.dataKey)
        if (!stored) {
            return { items: [] }
        }
        try {
            return JSON.parse(stored) as LocalTaskData
        } catch (error) {
            // Log the parse error with structured warning
            // Use ValidationError for structured error information, but return empty for graceful recovery
            const parseError = ValidationError.parseError(
                'Failed to parse local tasks from localStorage',
                error instanceof Error ? error : undefined
            )
            logger.error('Parse error loading local tasks:', {
                error: parseError.message,
                code: parseError.code,
                userMessage: parseError.userMessage,
                originalError: error,
            })
            // Return empty data to allow the app to continue functioning
            // This is preferable to throwing since localStorage is the source of truth
            // and corrupted data should not break the entire app
            return { items: [] }
        }
    }

    /**
     * Save tasks to localStorage
     */
    private saveData(): void {
        localStorage.setItem(this.dataKey, JSON.stringify(this.data))
    }

    /**
     * Check if cache is stale (always false for localStorage - it's the source of truth)
     */
    override isCacheStale(): boolean {
        return false
    }

    /**
     * Invalidate cache (no-op for localStorage - it's the source of truth)
     */
    override invalidateCache(): void {}

    /**
     * Sync method (no-op for localStorage, but maintains interface)
     */
    async sync(_resourceTypes?: string[]): Promise<void> {
        // LocalStorage doesn't need to sync with a server
        // This method exists to maintain interface compatibility
    }

    /**
     * Get upcoming tasks and recently completed tasks
     */
    getTasks(): EnrichedTask[] {
        if (!this.data.items) return []

        const mappedTasks = this.data.items
            .filter((item) => {
                if (item.is_deleted) return false
                if (!item.checked) return true
                return TaskProvider.isRecentlyCompleted(item.completed_at)
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
                    project_name: '',
                    label_names: [],
                    due_date: dueDate,
                    has_time: hasTime,
                }
            })

        return TaskProvider.sortTasks(mappedTasks)
    }

    /**
     * Complete a task
     */
    async completeTask(taskId: string): Promise<void> {
        const task = this.data.items.find((item) => item.id === taskId)
        if (task) {
            task.checked = true
            task.completed_at = new Date().toISOString()
            this.saveData()
        }
    }

    /**
     * Uncomplete a task (undo completion)
     */
    async uncompleteTask(taskId: string): Promise<void> {
        const task = this.data.items.find((item) => item.id === taskId)
        if (task) {
            task.checked = false
            task.completed_at = null
            this.saveData()
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<void> {
        const idx = this.data.items.findIndex((item) => item.id === taskId)
        if (idx !== -1) {
            this.data.items.splice(idx, 1)
            this.saveData()
        }
    }

    /**
     * Add a new task
     */
    async addTask(content: string, due: string | null): Promise<void> {
        const newDue: TaskDue | null = due ? { date: due } : null
        const newTask: RawTask = {
            id: generateUUID(),
            content: content,
            checked: false,
            completed_at: null,
            due: newDue,
            project_id: null,
            labels: [],
            child_order: this.data.items.length,
            is_deleted: false,
        }

        this.data.items.push(newTask)
        this.saveData()
    }

    /**
     * Clear local cache (no-op for localStorage backend)
     * Note: Unlike Todoist which clears cache, LocalStorage IS the source of truth.
     * Clearing it would permanently delete user tasks, which is not equivalent behavior.
     * Task deletion should be done explicitly through a separate UI action if needed.
     */
    clearLocalData(): void {}

    /**
     * Get project name by ID (always empty for localStorage)
     */
    override getProjectName(_projectId: string): string {
        return ''
    }

    /**
     * Get label names by IDs (always empty for localStorage)
     */
    override getLabelNames(_labelIds: string[]): string[] {
        return []
    }
}

export default LocalStorageProvider

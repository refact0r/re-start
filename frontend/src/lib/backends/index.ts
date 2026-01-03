import TodoistBackend from './todoist-backend'
import LocalStorageBackend from './localstorage-backend'
import GoogleTasksBackend from './google-tasks-backend'
import GoogleCalendarBackend from './google-calendar-backend'
import type TaskBackend from './task-backend'
import type { TaskBackendConfig, TaskBackendType } from '../types'

export function createTaskBackend(
    type: TaskBackendType,
    config: TaskBackendConfig
): TaskBackend {
    switch (type) {
        case 'todoist':
            return new TodoistBackend(config)
        case 'local':
            return new LocalStorageBackend(config)
        case 'google-tasks':
            return new GoogleTasksBackend(config)
        default:
            throw new Error(`Unknown backend type: ${type as string}`)
    }
}

export function createCalendarBackend(): GoogleCalendarBackend {
    return new GoogleCalendarBackend()
}

export {
    TodoistBackend,
    LocalStorageBackend,
    GoogleTasksBackend,
    GoogleCalendarBackend,
}

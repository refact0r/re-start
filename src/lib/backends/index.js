import TodoistBackend from './todoist-backend.js'
import LocalStorageBackend from './localstorage-backend.js'
import GoogleTasksBackend from './google-tasks-backend.js'
import GoogleCalendarBackend from './google-calendar-backend.js'

export function createTaskBackend(type, config) {
    switch (type) {
        case 'todoist':
            return new TodoistBackend(config)
        case 'local':
            return new LocalStorageBackend(config)
        case 'google-tasks':
            return new GoogleTasksBackend(config)
        default:
            throw new Error(`Unknown backend type: ${type}`)
    }
}

export function createCalendarBackend() {
    return new GoogleCalendarBackend()
}

export { TodoistBackend, LocalStorageBackend, GoogleTasksBackend, GoogleCalendarBackend }

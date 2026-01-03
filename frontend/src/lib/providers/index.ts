import TodoistProvider from './todoist-provider'
import LocalStorageProvider from './localstorage-provider'
import GoogleTasksProvider from './google-tasks-provider'
import GoogleCalendarProvider from './google-calendar-provider'
import type TaskProvider from './task-provider'
import type { TaskProviderConfig, TaskProviderType } from '../types'

export function createTaskProvider(
    type: TaskProviderType,
    config: TaskProviderConfig
): TaskProvider {
    switch (type) {
        case 'todoist':
            return new TodoistProvider(config)
        case 'local':
            return new LocalStorageProvider(config)
        case 'google-tasks':
            return new GoogleTasksProvider(config)
        default:
            throw new Error(`Unknown provider type: ${type as string}`)
    }
}

export function createCalendarProvider(): GoogleCalendarProvider {
    return new GoogleCalendarProvider()
}

export {
    TodoistProvider,
    LocalStorageProvider,
    GoogleTasksProvider,
    GoogleCalendarProvider,
}

<script lang="ts">
    import TodoistProvider from '../providers/todoist-provider'
    import LocalStorageProvider from '../providers/localstorage-provider'
    import GoogleTasksProvider from '../providers/google-tasks-provider'
    import { settings } from '../settings-store.svelte'
    import { authStore, AuthStatus } from '../stores/auth-store'
    import { parseSmartDate, stripDateMatch, formatRelativeDate } from '../date-matcher'
    import { Panel, Text, Row, Link, ScrollList, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'
    import TaskItem from './TaskItem.svelte'
    import AddTask from './AddTask.svelte'
    import type TaskProvider from '../providers/task-provider'
    import type { EnrichedTask } from '../types'

    // Derived config
    let isRemote = $derived(settings.taskBackend !== 'local')
    let taskLink = $derived(
        settings.taskBackend === 'todoist'
            ? 'https://todoist.com/app'
            : settings.taskBackend === 'google-tasks'
              ? 'https://tasks.google.com'
              : ''
    )
    let configError = $derived(
        settings.taskBackend === 'todoist' && !settings.todoistApiToken
            ? 'no todoist api token'
            : settings.taskBackend === 'google-tasks' &&
                $authStore.status === AuthStatus.Unauthenticated
              ? 'not signed in to google'
              : null
    )

    // State
    let provider: TaskProvider = createProvider(settings.taskBackend, settings.todoistApiToken)
    let tasks = $state<EnrichedTask[]>(provider.getTasks())
    let syncing = $state(false)
    let addingTask = $state(false)
    let newTaskContent = $state('')

    // Derived from state
    let taskCount = $derived(tasks.filter((t) => !t.checked).length)
    let parsedDate = $derived(parseSmartDate(newTaskContent, { dateFormat: settings.dateFormat }))

    function createProvider(backend: string, token: string): TaskProvider {
        if (backend === 'google-tasks') return new GoogleTasksProvider({})
        if (backend === 'todoist') return new TodoistProvider({ apiToken: token })
        return new LocalStorageProvider({})
    }

    $effect(() => {
        provider = createProvider(settings.taskBackend, settings.todoistApiToken)
        tasks = provider.getTasks()

        if ($authStore.status === AuthStatus.Authenticated && provider.isCacheStale()) {
            syncTasks()
        }
    })

    async function syncTasks(): Promise<void> {
        if (syncing) return
        syncing = true
        try {
            await provider.sync()
            tasks = provider.getTasks()
        } catch (err) {
            console.error('Failed to sync tasks:', err)
        } finally {
            syncing = false
        }
    }

    async function addTask(event: SubmitEvent): Promise<void> {
        event.preventDefault()
        const raw = newTaskContent.trim()
        if (!raw || addingTask) return

        const content = parsedDate?.match ? stripDateMatch(raw, parsedDate.match) || raw : raw
        const due = parsedDate?.date ?? null

        addingTask = true
        try {
            await provider.addTask(content, due)
            newTaskContent = ''
            provider.invalidateCache()
            await syncTasks()
        } catch (err) {
            console.error('Failed to add task:', err)
        } finally {
            addingTask = false
        }
    }

    async function toggleTask(taskId: string, checked: boolean): Promise<void> {
        // Optimistic update
        tasks = tasks.map((t) =>
            t.id === taskId
                ? { ...t, checked, completed_at: checked ? new Date().toISOString() : null }
                : t
        )

        try {
            await (checked ? provider.completeTask(taskId) : provider.uncompleteTask(taskId))
            provider.invalidateCache()
            await syncTasks()
        } catch (err) {
            console.error('Failed to toggle task:', err)
            await syncTasks()
        }
    }

    async function deleteTask(taskId: string): Promise<void> {
        tasks = tasks.filter((t) => t.id !== taskId)
        try {
            await provider.deleteTask(taskId)
            provider.invalidateCache()
        } catch (err) {
            console.error('Failed to delete task:', err)
            provider.invalidateCache()
            await syncTasks()
        }
    }

    function isOverdue(task: EnrichedTask): boolean {
        return !!task.due_date && !task.checked && task.due_date.getTime() < Date.now()
    }
</script>

<svelte:document onvisibilitychange={syncTasks} />

<Panel label={syncing ? 'syncing...' : 'tasks'} clickableLabel onLabelClick={syncTasks} flex={1}>
    {#if configError}
        <Text color="error">{configError}</Text>
    {:else}
        <Row gap="sm">
            {#if isRemote}
                <Link href={taskLink} target="_blank">
                    <Text color="primary">{taskCount}</Text> task{taskCount === 1 ? '' : 's'}
                </Link>
            {:else}
                <Text><Text color="primary">{taskCount}</Text> task{taskCount === 1 ? '' : 's'}</Text>
            {/if}
            <AddTask
                bind:value={newTaskContent}
                bind:parsed={parsedDate}
                disabled={addingTask}
                loading={addingTask}
                show={tasks.length === 0}
                onsubmit={addTask}
            />
        </Row>

        <br />
        <ScrollList>
            {#each tasks as task (task.id)}
                <TaskItem
                    checked={task.checked}
                    project={task.project_name}
                    content={task.content}
                    due={task.due_date
                        ? formatRelativeDate(task.due_date, task.has_time, {
                              timeFormat: settings.timeFormat,
                          })
                        : null}
                    overdue={isOverdue(task)}
                    onToggle={() => toggleTask(task.id, !task.checked)}
                    onDelete={() => deleteTask(task.id)}
                />
            {/each}
        </ScrollList>
        {#if isRemote}
            <Button variant="sync" onclick={syncTasks} disabled={syncing} spinning={syncing} title="sync">
                <RefreshCw size={14} />
            </Button>
        {/if}
    {/if}
</Panel>

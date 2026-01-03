<script lang="ts">
    import { onMount, onDestroy, untrack } from 'svelte'
    import { createTaskBackend } from '../backends/index'
    import { settings } from '../settings-store.svelte'
    import { authStore } from '../stores/auth-store'
    import type { AuthStatus } from '../stores/auth-store'
    import {
        parseSmartDate,
        stripDateMatch,
        formatTaskDue,
        formatRelativeDate,
    } from '../date-matcher'
    import { Panel, Text, Row, Link, ScrollList, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'
    import TaskItem from './TaskItem.svelte'
    import AddTask from './AddTask.svelte'
    import type TaskBackend from '../backends/task-backend'
    import type { EnrichedTask, TaskBackendType } from '../types'

    let api: TaskBackend | null = null
    let tasks = $state<EnrichedTask[]>([])
    let syncing = $state(true)
    let error = $state('')
    let initialLoad = $state(true)
    let previousToken = $state<string | null>(null)
    let taskCount = $derived(tasks.filter((task) => !task.checked).length)
    let newTaskContent = $state('')
    let addingTask = $state(false)
    let parsedDate = $derived(
        parseSmartDate(newTaskContent, {
            dateFormat: settings.dateFormat,
        })
    )
    let togglingTasks = $state(new Set<string>())
    let syncInProgress = false

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && api) {
            loadTasks()
        }
    }

    $effect(() => {
        const backend = settings.taskBackend
        const token = settings.todoistApiToken
        const authStatus = $authStore.status

        console.log('[Tasks] Effect triggered:', { backend, authStatus })

        if (untrack(() => initialLoad)) {
            initialLoad = false
            previousToken = token
            return
        }

        const tokenChanged = backend === 'todoist' && previousToken !== token
        previousToken = token
        initializeAPI(backend, token, authStatus, tokenChanged)
    })

    async function initializeAPI(
        backend: TaskBackendType,
        token: string,
        authStatus: AuthStatus,
        clearLocalData = false
    ): Promise<void> {
        if (backend === 'todoist' && !token) {
            api = null
            tasks = []
            syncing = false
            error = 'no todoist api token'
            return
        }

        if (backend === 'google-tasks' && authStatus === 'unauthenticated') {
            api = null
            tasks = []
            syncing = false
            error = 'not signed in to google'
            return
        }

        error = ''

        try {
            if (backend === 'google-tasks') {
                api = createTaskBackend(backend)
            } else {
                api = createTaskBackend(backend, { token })
            }

            if (clearLocalData) {
                api.clearLocalData()
                tasks = []
            }

            const cachedTasks = api.getTasks()
            if (cachedTasks.length > 0) {
                tasks = cachedTasks
                syncing = false
            }

            if (
                authStatus === 'authenticated' &&
                (api.isCacheStale() || cachedTasks.length === 0)
            ) {
                loadTasks(cachedTasks.length === 0)
            } else if (authStatus === 'unknown') {
                syncing = false
            }
        } catch (err) {
            error = `failed to initialize ${backend} backend`
            console.error(err)
            syncing = false
        }
    }

    async function loadTasks(showSyncing = false): Promise<void> {
        if (syncInProgress) return
        syncInProgress = true
        try {
            if (showSyncing) syncing = true
            error = ''
            await api.sync()
            tasks = api.getTasks()
        } catch (err) {
            error = `failed to sync tasks`
            console.error(err)
        } finally {
            if (showSyncing) syncing = false
            syncInProgress = false
        }
    }

    async function addTask(event: SubmitEvent): Promise<void> {
        event.preventDefault()
        const raw = newTaskContent.trim()
        if (!raw || !api || addingTask) return

        let content = raw
        let due = null
        if (parsedDate?.match) {
            const cleaned = stripDateMatch(raw, parsedDate.match)
            content = cleaned || raw
            due = formatTaskDue(parsedDate.date, parsedDate.hasTime)
        }
        try {
            addingTask = true
            await api.addTask(content, due)
            newTaskContent = ''
            api.invalidateCache()
            await loadTasks()
        } catch (err) {
            console.error('Failed to add task:', err)
        } finally {
            addingTask = false
        }
    }

    async function toggleTask(taskId: string, checked: boolean): Promise<void> {
        if (togglingTasks.has(taskId)) return

        try {
            togglingTasks.add(taskId)

            tasks = tasks.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          checked,
                          completed_at: checked
                              ? new Date().toISOString()
                              : null,
                      }
                    : task
            )

            if (checked) {
                await api.completeTask(taskId)
            } else {
                await api.uncompleteTask(taskId)
            }
            api.invalidateCache()
            await loadTasks()
        } catch (err) {
            console.error(err)
            await loadTasks()
        } finally {
            togglingTasks.delete(taskId)
        }
    }

    async function deleteTask(taskId: string): Promise<void> {
        if (!api) return
        try {
            tasks = tasks.filter((task) => task.id !== taskId)
            await api.deleteTask(taskId)
            api.invalidateCache()
            await loadTasks()
        } catch (err) {
            console.error('Failed to delete task:', err)
            api.invalidateCache()
            await loadTasks()
        }
    }

    function isTaskOverdue(task: EnrichedTask): boolean {
        if (!task.due || task.checked) return false
        const now = new Date()
        return task.due_date.getTime() < now.getTime()
    }

    function getTaskLink(): string {
        if (settings.taskBackend === 'todoist') return 'https://todoist.com/app'
        if (settings.taskBackend === 'google-tasks')
            return 'https://tasks.google.com'
        return ''
    }

    onMount(() => {
        initializeAPI(
            settings.taskBackend,
            settings.todoistApiToken,
            $authStore.status
        )
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<Panel
    label={syncing ? 'syncing...' : 'tasks'}
    clickableLabel
    onLabelClick={() => loadTasks(true)}
    flex={1}
>
    {#if error}
        <Text color="error">{error}</Text>
    {:else}
        <Row gap="sm">
            {#if settings.taskBackend !== 'local'}
                <Link href={getTaskLink()} target="_blank">
                    <Text color="primary">{taskCount}</Text> task{taskCount ===
                    1
                        ? ''
                        : 's'}
                </Link>
            {:else}
                <Text
                    ><Text color="primary">{taskCount}</Text> task{taskCount ===
                    1
                        ? ''
                        : 's'}</Text
                >
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
                    overdue={isTaskOverdue(task)}
                    onToggle={() => toggleTask(task.id, !task.checked)}
                    onDelete={() => deleteTask(task.id)}
                />
            {/each}
        </ScrollList>
        {#if settings.taskBackend !== 'local'}
            <Button
                variant="sync"
                onclick={() => loadTasks(true)}
                disabled={syncing}
                spinning={syncing}
                title="sync"
            >
                <RefreshCw size={14} />
            </Button>
        {/if}
    {/if}
</Panel>

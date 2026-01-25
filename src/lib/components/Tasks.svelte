<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import { createTaskBackend } from '../backends/index.js'
    import { settings } from '../stores/settings-store.svelte.js'
    import { isChrome } from '../utils/browser-detect.js'
    import AddTask from './AddTask.svelte'
    import {
        parseSmartDate,
        stripDateMatch,
        formatTaskDue,
    } from '../utils/date-matcher.js'
    import {
        parseProjectMatch,
        stripProjectMatch,
    } from '../utils/project-matcher.js'

    let api = null
    let tasks = $state([])
    let availableProjects = $state([])
    let syncing = $state(true)
    let error = $state('')
    let initialLoad = $state(true)
    let previousToken = $state(null)
    let previousBackend = $state(null)
    let isRevealed = $state(false)
    let taskCount = $derived(tasks.filter((task) => !task.checked).length)
    let taskLabel = $derived(taskCount === 1 ? 'task' : 'tasks')

    function reveal() {
        isRevealed = true
    }

    function hide() {
        isRevealed = false
    }
    let backendUrl = $derived.by(() => {
        if (settings.taskBackend === 'todoist')
            return 'https://app.todoist.com/app'
        if (settings.taskBackend === 'google-tasks')
            return 'https://tasks.google.com'
        return null
    })
    let newTaskContent = $state('')
    let addingTask = $state(false)
    let togglingTasks = $state(new Set())
    let addTaskComponent = $state()
    let editBuffer = $state({})

    // Derived project match
    let parsedProject = $derived(
        parseProjectMatch(newTaskContent, availableProjects)
    )

    // Derived date match - parse from text AFTER stripping project
    // To avoid false matches across the project boundary (e.g., "dec #project 12" matching "dec 12"),
    // we parse the left and right halves separately when a project is present
    let parsedDate = $derived.by(() => {
        if (!parsedProject?.match) {
            // No project match, parse entire text
            return parseSmartDate(newTaskContent, {
                dateFormat: settings.dateFormat,
            })
        }

        // Split around project match and try each half
        const leftHalf = newTaskContent
            .slice(0, parsedProject.match.start)
            .trimEnd()
        const rightHalf = newTaskContent
            .slice(parsedProject.match.end)
            .trimStart()

        // Try left half first
        const leftResult = parseSmartDate(leftHalf, {
            dateFormat: settings.dateFormat,
        })
        if (leftResult) {
            return leftResult // positions already correct for original text
        }

        // Try right half
        const rightResult = parseSmartDate(rightHalf, {
            dateFormat: settings.dateFormat,
        })
        if (rightResult) {
            // Offset positions to account for stripped whitespace and project
            const rightStartOffset =
                parsedProject.match.end +
                (newTaskContent.slice(parsedProject.match.end).length -
                    rightHalf.length)
            return {
                ...rightResult,
                match: {
                    start: rightResult.match.start + rightStartOffset,
                    end: rightResult.match.end + rightStartOffset,
                },
            }
        }

        return null
    })

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && api) {
            loadTasks()
        }
    }

    function handleGlobalKeydown(event) {
        // Only auto-focus if:
        // 1. No input, textarea, or contenteditable element is currently focused
        // 2. The key is a printable character (not a modifier or special key)
        const activeElement = document.activeElement
        const isInputFocused =
            activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            (activeElement instanceof HTMLElement &&
                activeElement.isContentEditable)

        if (
            addTaskComponent &&
            !isInputFocused &&
            event.key.length === 1 && // Printable character
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            addTaskComponent.focus()
        }
    }

    $effect(() => {
        const backend = settings.taskBackend
        const token = settings.todoistApiToken
        const googleSignedIn = settings.googleTasksSignedIn

        if (untrack(() => initialLoad)) {
            initialLoad = false
            previousToken = token
            previousBackend = backend
            return
        }

        // Clear local data if:
        // 1. Todoist token changed
        // 2. Backend changed (switching between local/todoist/google-tasks)
        const tokenChanged = backend === 'todoist' && previousToken !== token
        const backendChanged = previousBackend !== backend
        const clearLocalData = tokenChanged || backendChanged

        previousToken = token
        previousBackend = backend
        initializeAPI(backend, token, clearLocalData)
    })

    function resetState(errorMessage) {
        api = null
        tasks = []
        availableProjects = []
        editBuffer = {}
        syncing = false
        error = errorMessage
    }

    async function initializeAPI(backend, token, clearLocalData = false) {
        if (backend === 'todoist' && !token) {
            resetState('no todoist api token')
            return
        }

        if (backend === 'google-tasks' && !isChrome()) {
            resetState('google tasks only works in chrome')
            return
        }

        if (backend === 'google-tasks' && !settings.googleTasksSignedIn) {
            resetState('not signed in to google')
            return
        }

        try {
            const config = backend === 'google-tasks' ? undefined : { token }
            api = createTaskBackend(backend, config)

            if (clearLocalData) {
                api.clearLocalData()
                tasks = []
                availableProjects = []
                editBuffer = {}
            }
            await loadTasks(true)
        } catch (err) {
            error = `failed to initialize ${backend} backend`
            console.error('backend init failed:', err)
            syncing = false
        }
    }

    async function loadTasks(showSyncing = false) {
        try {
            if (showSyncing) syncing = true
            error = ''
            await api.sync()
            tasks = api.getTasks()

            // Initialize edit buffer for inline editing
            // Preserve existing entries to avoid losing user edits during background syncs
            const newEditBuffer = {}
            tasks.forEach((t) => {
                // Keep existing value if present, otherwise use task content
                newEditBuffer[t.id] = editBuffer[t.id] ?? t.content ?? ''
            })
            editBuffer = newEditBuffer

            // Update available projects/lists
            if (settings.taskBackend === 'todoist') {
                availableProjects = (api.data?.projects || []).map((p) => ({
                    id: p.id,
                    name: p.name,
                }))
            } else if (settings.taskBackend === 'google-tasks') {
                availableProjects = (api.data?.tasklists || []).map((tl) => ({
                    id: tl.id,
                    name: tl.title,
                }))
            }
        } catch (err) {
            // Check if this is an auth error for Google Tasks
            if (
                settings.taskBackend === 'google-tasks' &&
                err.message?.includes('Authentication expired')
            ) {
                settings.googleTasksSignedIn = false
                error = 'google sign in expired'
            } else {
                error = `failed to sync tasks`
            }
            console.error('task sync failed:', err)
        } finally {
            if (showSyncing) syncing = false
        }
    }

    async function commitEdit(taskId) {
        if (!api) return
        const newContent = (editBuffer[taskId] ?? '').trim()
        const original = tasks.find((t) => t.id === taskId)?.content ?? ''
        if (!newContent || newContent === original) return

        try {
            await api.editTaskName(taskId, newContent)
            await loadTasks()
        } catch (err) {
            console.error('failed to edit task name:', err)
            await loadTasks()
        }
    }

    async function addTask(event) {
        event.preventDefault()
        const raw = newTaskContent.trim()
        if (!raw || !api || addingTask) return

        let content = raw
        let due = null
        let projectId = null

        // Strip project match first (matches parsing precedence)
        if (parsedProject?.match) {
            const cleaned = stripProjectMatch(content, parsedProject.match)
            content = cleaned || content
            projectId = parsedProject.projectId
        }

        // Then strip date match
        if (parsedDate?.match) {
            const cleaned = stripDateMatch(content, parsedDate.match)
            content = cleaned || content
            due = formatTaskDue(parsedDate.date, parsedDate.hasTime)
        }

        try {
            addingTask = true
            await api.addTask(content, due, projectId)
            newTaskContent = ''
            await loadTasks()
        } catch (err) {
            console.error('failed to add task:', err)
        } finally {
            addingTask = false
        }
    }

    async function toggleTask(taskId, checked) {
        // Prevent concurrent toggles of the same task
        if (togglingTasks.has(taskId)) return

        const previousTasks = [...tasks]
        try {
            togglingTasks.add(taskId)

            tasks = tasks.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          checked: checked,
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
            await loadTasks()
        } catch (err) {
            console.error('task toggle failed:', err)
            // Revert optimistic update before refreshing
            tasks = previousTasks
            await loadTasks()
        } finally {
            togglingTasks.delete(taskId)
        }
    }

    async function deleteTask(taskId) {
        if (!api) return
        try {
            tasks = tasks.filter((task) => task.id !== taskId)
            await api.deleteTask(taskId)
            await loadTasks()
        } catch (err) {
            console.error('failed to delete task:', err)
            await loadTasks()
        }
    }

    function isTaskOverdue(task) {
        if (!task.due || task.checked) return false
        const now = new Date()
        return task.due_date.getTime() < now.getTime()
    }

    function formatDueDate(date, hasTime) {
        if (!date) return ''

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const dueDate = new Date(date)
        const dueDateOnly = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate()
        )

        const msPerDay = 1000 * 60 * 60 * 24
        const diffTime = dueDateOnly.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / msPerDay)

        let dateString = getRelativeDateString(diffDays, dueDate)

        if (hasTime) {
            const use12Hour = settings.timeFormat === '12hr'
            const timeString = dueDate
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: use12Hour,
                })
                .toLowerCase()
            dateString += ` ${timeString}`
        }

        return dateString
    }

    function getRelativeDateString(diffDays, dueDate) {
        if (diffDays === -1) return 'yesterday'
        if (diffDays === 0) return 'today'
        if (diffDays === 1) return 'tmrw'

        if (diffDays >= 2 && diffDays < 7) {
            return dueDate
                .toLocaleDateString('en-US', { weekday: 'short' })
                .toLowerCase()
        }

        return dueDate
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            .toLowerCase()
    }

    onMount(() => {
        initializeAPI(settings.taskBackend, settings.todoistApiToken)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('keydown', handleGlobalKeydown)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        document.removeEventListener('keydown', handleGlobalKeydown)
    })
</script>

<div
    class="panel-wrapper"
    onmouseenter={reveal}
    onmouseleave={hide}
    onfocusin={reveal}
    onfocusout={hide}
    role="group"
>
    <button
        class="widget-label"
        onclick={() => loadTasks(true)}
        disabled={syncing}
    >
        {syncing ? 'syncing...' : 'tasks'}
    </button>
    <div class="panel">
        <div class="panel-content">
            {#if error}
                <div class="error">{error}</div>
            {:else}
                <div class="widget-header">
                    {#if backendUrl}
                        <a
                            href={backendUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span class="bright">{taskCount}</span>
                            {taskLabel}
                        </a>
                    {:else}
                        <span>
                            <span class="bright">{taskCount}</span>
                            {taskLabel}
                        </span>
                    {/if}
                    <AddTask
                        bind:this={addTaskComponent}
                        bind:value={newTaskContent}
                        bind:parsed={parsedDate}
                        {parsedProject}
                        disabled={addingTask}
                        loading={addingTask}
                        show={tasks.length === 0}
                        onsubmit={addTask}
                    />
                </div>

                <br />
                <div class="tasks">
                    <div class="tasks-list">
                        {#each tasks as task}
                            <div class="task" class:completed={task.checked}>
                                <button
                                    onclick={() =>
                                        toggleTask(task.id, !task.checked)}
                                    class="checkbox"
                                >
                                    {#if task.checked}
                                        [<span class="checkbox-x">x</span>]
                                    {:else}
                                        [ ]
                                    {/if}
                                </button>
                                {#if task.project_name && task.project_name !== 'Inbox'}
                                    <span class="task-project"
                                        >#{task.project_name}</span
                                    >
                                {/if}
                                <span class="task-title">
                                    <input
                                        class="task-title-input"
                                        class:hidden={!isRevealed}
                                        aria-label="edit task name"
                                        bind:value={editBuffer[task.id]}
                                        onblur={() => commitEdit(task.id)}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                e.target.blur()
                                            }
                                        }}
                                        tabindex={isRevealed ? 0 : -1}
                                    />
                                    {#if !isRevealed}
                                        <span class="task-title-masked">•••</span>
                                    {/if}
                                </span>
                                {#if task.due_date}
                                    <span
                                        class="task-due"
                                        class:overdue={isTaskOverdue(task)}
                                    >
                                        {formatDueDate(
                                            task.due_date,
                                            task.has_time
                                        )}
                                    </span>
                                {/if}
                                <button
                                    type="button"
                                    class="task-delete"
                                    onclick={() => deleteTask(task.id)}
                                    aria-label="delete task"
                                    title="delete"
                                >
                                    x
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .panel-wrapper {
        flex: 1;
        max-width: 40rem;
    }
    .widget-header {
        display: flex;
        gap: 1ch;
    }
    .tasks {
        max-height: 15rem;
        overflow: auto;
        scrollbar-width: none;
        scroll-snap-type: y proximity;
    }
    .task {
        display: flex;
        align-items: baseline;
        gap: 1ch;
        max-width: 40rem;
        white-space: nowrap;
        scroll-snap-align: start;
    }
    .task-title {
        position: relative;
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .task-title-input {
        all: unset;
        display: block;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .task-title-input.hidden {
        visibility: hidden;
    }
    .task-due {
        color: var(--txt-3);
        margin-left: 3ch;
    }
    .task-project {
        color: var(--txt-3);
    }
    .task-delete {
        opacity: 0;
        pointer-events: none;
    }
    .task:hover .task-delete,
    .task:focus-within .task-delete {
        opacity: 1;
        pointer-events: auto;
    }
    .task.completed .task-title input {
        text-decoration: line-through;
    }
    .overdue {
        color: var(--txt-err);
    }
    a:hover {
        color: var(--txt-1);
    }
    .checkbox-x {
        color: var(--txt-2);
    }
    .task-title-masked {
        position: absolute;
        top: 0;
        left: 0;
        color: var(--txt-3);
        filter: blur(4px);
    }
</style>

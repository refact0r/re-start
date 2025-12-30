<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import { createTaskBackend } from '../backends/index.js'
    import { settings } from '../settings-store.svelte.js'
    import { isChrome } from '../browser-detect.js'
    import AddTask from './AddTask.svelte'
    import {
        parseSmartDate,
        stripDateMatch,
        formatTaskDue,
    } from '../date-matcher.js'
    import { parseProjectMatch, stripProjectMatch } from '../project-matcher.js'

    let api = null
    let tasks = $state([])
    let availableProjects = $state([])
    let syncing = $state(true)
    let error = $state('')
    let initialLoad = $state(true)
    let previousToken = $state(null)
    let taskCount = $derived(tasks.filter((task) => !task.checked).length)
    let newTaskContent = $state('')
    let addingTask = $state(false)
    let togglingTasks = $state(new Set())
    let addTaskComponent = $state()

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
            (activeElement instanceof HTMLElement && activeElement.isContentEditable)

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
            return
        }

        // Only clear Todoist data if the token changed (not the backend)
        const tokenChanged = backend === 'todoist' && previousToken !== token
        previousToken = token
        initializeAPI(backend, token, tokenChanged)
    })

    async function initializeAPI(backend, token, clearLocalData = false) {
        if (backend === 'todoist' && !token) {
            api = null
            tasks = []
            availableProjects = []
            syncing = false
            error = 'no todoist api token'
            return
        }

        if (backend === 'google-tasks' && !isChrome()) {
            api = null
            tasks = []
            availableProjects = []
            syncing = false
            error = 'google tasks only works in chrome'
            return
        }

        if (backend === 'google-tasks' && !settings.googleTasksSignedIn) {
            api = null
            tasks = []
            availableProjects = []
            syncing = false
            error = 'not signed in to google'
            return
        }

        try {
            if (backend === 'google-tasks') {
                api = createTaskBackend(backend)
            } else {
                api = createTaskBackend(backend, { token })
            }

            if (clearLocalData) {
                api.clearLocalData()
                tasks = []
                availableProjects = []
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

        const diffTime = dueDateOnly.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let dateString = ''

        if (diffDays === -1) {
            dateString = 'yesterday'
        } else if (diffDays === 0) {
            dateString = 'today'
        } else if (diffDays === 1) {
            dateString = 'tmrw'
        } else if (diffDays > 1 && diffDays < 7) {
            dateString = dueDate
                .toLocaleDateString('en-US', {
                    weekday: 'short',
                })
                .toLowerCase()
        } else {
            dateString = dueDate
                .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                })
                .toLowerCase()
        }

        if (hasTime) {
            let timeString
            if (settings.timeFormat === '12hr') {
                timeString = dueDate
                    .toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    })
                    .toLowerCase()
            } else {
                timeString = dueDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: false,
                })
            }
            dateString += ` ${timeString}`
        }

        return dateString
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

<div class="panel-wrapper">
    <button
        class="widget-label"
        onclick={() => loadTasks(true)}
        disabled={syncing}
    >
        {syncing ? 'syncing...' : 'tasks'}
    </button>
    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else}
            <div class="widget-header">
                {#if settings.taskBackend === 'todoist'}
                    <a
                        href="https://app.todoist.com/app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="bright">{taskCount}</span>
                        task{taskCount === 1 ? '' : 's'}
                    </a>
                {:else if settings.taskBackend === 'google-tasks'}
                    <a
                        href="https://tasks.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="bright">{taskCount}</span>
                        task{taskCount === 1 ? '' : 's'}
                    </a>
                {:else}
                    <span>
                        <span class="bright">{taskCount}</span>
                        task{taskCount === 1 ? '' : 's'}
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
                            <span class="task-title"
                                >{task.content || '(no content)'}</span
                            >
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

<style>
    .panel-wrapper {
        flex: 1;
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
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .task-due {
        color: var(--txt-3);
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
    .task.completed .task-title {
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
</style>

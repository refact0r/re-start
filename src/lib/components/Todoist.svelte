<script>
    import { onMount, untrack } from 'svelte'
    import TodoistAPI from '../todoist-api.js'
    import { settings } from '../settings-store.svelte.js'

    let api = null
    let tasks = $state([])
    let syncing = $state(true)
    let error = $state('')
    let initialLoad = $state(true)
    let taskCount = $derived(tasks.filter((task) => !task.checked).length)

    $effect(() => {
        const token = settings.todoistApiToken

        if (untrack(() => initialLoad)) {
            initialLoad = false
            return
        }

        initializeAPI(token, true)
    })

    async function initializeAPI(token, clearLocalData = false) {
        if (!token) {
            api = null
            tasks = []
            syncing = false
            error = 'no todoist api token'
            return
        }
        api = new TodoistAPI(token)
        if (clearLocalData) {
            api.clearLocalData()
            tasks = []
        }
        await loadTasks(true)
    }

    export async function loadTasks(showSyncing = false) {
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
        }
    }

    async function toggleTask(taskId, checked) {
        try {
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
            console.error(err)
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
        initializeAPI(settings.todoistApiToken)
        if (api) {
            tasks = api.getTasks()
        }
    })
</script>

<div class="todoist">
    <div class="widget-header">
        {#if syncing}
            syncing...
        {:else if error}
            <span class="error">{error}</span>
        {:else}
            <a
                href="https://todoist.com/app"
                target="_blank"
                rel="noopener noreferrer"
            >
                {taskCount} task{taskCount === 1 ? '' : 's'}
            </a>
        {/if}
        <button
            onclick={() => loadTasks(true)}
            disabled={syncing}
            class="refresh"
        >
            refresh
        </button>
    </div>

    {#if tasks.length > 0}
        <br />
        <div class="tasks">
            <div class="tasks-list">
                {#each tasks as task}
                    <div
                        class="task"
                        class:completed={task.checked}
                        class:overdue={isTaskOverdue(task)}
                    >
                        <button
                            onclick={() => toggleTask(task.id, !task.checked)}
                            class="checkbox"
                            class:completed={task.checked}
                        >
                            {task.checked ? '[x]' : '[ ]'}
                        </button>
                        {#if task.project_name && task.project_name !== 'Inbox'}
                            <span class="task-project"
                                >#{task.project_name}</span
                            >
                        {/if}
                        <span class="task-title">{task.content}</span>
                        {#if task.due}
                            <span
                                class="task-due"
                                class:overdue-date={isTaskOverdue(task)}
                            >
                                {formatDueDate(task.due_date, task.has_time)}
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .tasks {
        max-height: 15rem;
        overflow: auto;
        scrollbar-width: none;
    }

    .task-due {
        color: var(--txt-3);
    }

    .task-project {
        color: var(--txt-3);
    }

    .task.completed .task-title {
        text-decoration: line-through;
    }

    .overdue-date {
        color: var(--txt-err);
    }
</style>

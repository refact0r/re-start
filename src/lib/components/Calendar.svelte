<script>
    import { onMount, onDestroy } from 'svelte'
    import { createCalendarBackend } from '../backends/index.js'
    import { settings } from '../settings-store.svelte.js'

    let api = null
    let events = $state([])
    let syncing = $state(true)
    let error = $state('')
    let eventCount = $derived(events.length)

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && api) {
            loadEvents()
        }
    }

    $effect(() => {
        const googleSignedIn = settings.googleTasksSignedIn

        if (googleSignedIn) {
            initializeAPI()
        } else {
            api = null
            events = []
            syncing = false
            error = 'not signed in to google'
        }
    })

    async function initializeAPI() {
        try {
            api = createCalendarBackend()

            if (!api.getIsSignedIn()) {
                error = 'google sign in expired'
                syncing = false
                return
            }

            // Load cached data immediately
            events = api.getEvents()

            // Only show syncing if no cached data
            const hasCachedData = events.length > 0
            if (hasCachedData) {
                syncing = false
            }

            // Sync if cache is stale
            if (api.isCacheStale()) {
                await loadEvents(!hasCachedData)
            } else {
                syncing = false
            }
        } catch (err) {
            error = 'failed to initialize calendar'
            console.error(err)
            syncing = false
        }
    }

    async function loadEvents(showSyncing = false) {
        try {
            if (showSyncing) syncing = true
            error = ''
            await api.sync(settings.selectedCalendars)
            events = api.getEvents()
        } catch (err) {
            error = 'failed to sync calendar'
            console.error(err)
        } finally {
            syncing = false
        }
    }

    function formatEventTime(event) {
        if (event.isAllDay) {
            return 'all day'
        }

        const formatTime = (date) => {
            if (settings.timeFormat === '12hr') {
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                }).toLowerCase()
            } else {
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: false,
                })
            }
        }

        return formatTime(event.startTime)
    }

    onMount(() => {
        if (settings.googleTasksSignedIn) {
            initializeAPI()
        } else {
            syncing = false
            error = 'not signed in to google'
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="panel-wrapper">
    <button
        class="widget-label"
        onclick={() => loadEvents(true)}
        disabled={syncing}
    >
        {syncing ? 'syncing...' : 'calendar'}
    </button>
    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else}
            <div class="widget-header">
                <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span class="bright">{eventCount}</span>
                    event{eventCount === 1 ? '' : 's'} today
                </a>
            </div>

            <br />
            <div class="events">
                <div class="events-list">
                    {#each events as event}
                        <div
                            class="event"
                            class:past={event.isPast}
                            class:ongoing={event.isOngoing}
                        >
                            <span class="event-time">{formatEventTime(event)}</span>
                            <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="event-title"
                            >
                                {event.title}
                            </a>
                            {#if event.location}
                                <span class="event-location">@ {event.location}</span>
                            {/if}
                        </div>
                    {/each}
                    {#if events.length === 0 && !syncing}
                        <div class="no-events">no events today</div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex: 1;
    }
    .events {
        max-height: 15rem;
        overflow: auto;
        scrollbar-width: none;
        scroll-snap-type: y proximity;
    }
    .event {
        display: flex;
        align-items: baseline;
        gap: 1ch;
        max-width: 40rem;
        white-space: nowrap;
        scroll-snap-align: start;
    }
    .event-time {
        color: var(--txt-2);
        min-width: 7ch;
    }
    .event-title {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .event-title:hover {
        color: var(--txt-1);
    }
    .event-location {
        color: var(--txt-3);
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 15ch;
    }
    .event.past {
        opacity: 0.5;
    }
    .event.ongoing .event-time {
        color: var(--txt-accent);
    }
    .no-events {
        color: var(--txt-3);
    }
    a:hover {
        color: var(--txt-1);
    }
</style>

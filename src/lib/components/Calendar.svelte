<script>
    import { onMount, onDestroy } from 'svelte'
    import { createCalendarBackend } from '../backends/index.js'
    import { settings } from '../settings-store.svelte.js'
    import { authState } from '../backends/google-auth.js'
    import { RefreshCw, Video } from 'lucide-svelte'

    function getVideoProvider(url) {
        if (!url) return null
        if (url.includes('meet.google.com') || url.includes('hangouts.google.com')) return 'meet'
        if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams'
        if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom'
        return 'other'
    }

    let api = null
    let events = $state([])
    let syncing = $state(true)
    let error = $state('')
    let eventCount = $derived(events.length)
    let syncInProgress = false
    let googleAuthStatus = $state(authState.status)
    let unsubscribeAuth = null

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && api) {
            loadEvents()
        }
    }

    $effect(() => {
        const authStatus = googleAuthStatus
        console.log('[Calendar] Effect triggered:', { authStatus })
        initializeAPI(authStatus)
    })

    async function initializeAPI(authStatus) {
        if (authStatus === 'unauthenticated') {
            api = null
            events = []
            syncing = false
            error = 'not signed in to google'
            return
        }

        error = ''

        try {
            api = createCalendarBackend()

            // Load cached data immediately (works for 'unknown' and 'authenticated')
            const cachedEvents = api.getEvents()
            if (cachedEvents.length > 0) {
                events = cachedEvents
                syncing = false
            }

            // Sync in background if authenticated and cache is stale
            if (authStatus === 'authenticated' && (api.isCacheStale() || cachedEvents.length === 0)) {
                loadEvents(cachedEvents.length === 0)
            } else if (authStatus === 'unknown') {
                syncing = false
            }
        } catch (err) {
            error = 'failed to initialize calendar'
            console.error(err)
            syncing = false
        }
    }

    async function loadEvents(showSyncing = false) {
        if (syncInProgress) return
        syncInProgress = true
        try {
            if (showSyncing) syncing = true
            error = ''
            const calendars = settings.selectedCalendars
            await api.sync(calendars)
            events = api.getEvents()
        } catch (err) {
            error = 'failed to sync calendar'
            console.error(err)
        } finally {
            syncing = false
            syncInProgress = false
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
        unsubscribeAuth = authState.subscribe((state) => {
            console.log('[Calendar] Auth state update:', state.status)
            googleAuthStatus = state.status
        })
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth()
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
                        {@const videoProvider = getVideoProvider(event.hangoutLink)}
                        <div
                            class="event"
                            class:past={event.isPast}
                            class:ongoing={event.isOngoing}
                        >
                            <span class="event-time">{formatEventTime(event)}</span>
                            <div class="event-details">
                                <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="event-title"
                                >
                                    {event.title}
                                </a>
                                {#if event.location || videoProvider}
                                    <div class="event-meta">
                                        {#if event.location}
                                            <span class="event-location">{event.location}</span>
                                        {/if}
                                        {#if videoProvider}
                                            <a
                                                href={event.hangoutLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="event-video"
                                                title="Join video call"
                                            >
                                                {#if videoProvider === 'meet'}
                                                    <svg class="video-icon" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                    </svg>
                                                {:else if videoProvider === 'teams'}
                                                    <svg class="video-icon" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M19.5 5h-3V3.5A1.5 1.5 0 0015 2H9a1.5 1.5 0 00-1.5 1.5V5h-3A1.5 1.5 0 003 6.5v11A1.5 1.5 0 004.5 19H9v1.5A1.5 1.5 0 0010.5 22h3a1.5 1.5 0 001.5-1.5V19h4.5a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0019.5 5zM9 3.5h6V5H9V3.5zM13.5 20.5h-3V19h3v1.5zM19.5 17.5h-15v-11h15v11z"/>
                                                    </svg>
                                                {:else if videoProvider === 'zoom'}
                                                    <svg class="video-icon" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M4 4h10a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14 3l4-2v10l-4-2V7z"/>
                                                    </svg>
                                                {:else}
                                                    <Video size={12} />
                                                {/if}
                                            </a>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                    {#if events.length === 0 && !syncing}
                        <div class="no-events">no events today</div>
                    {/if}
                </div>
            </div>
            <button
                class="sync-btn"
                onclick={() => loadEvents(true)}
                disabled={syncing}
                title="sync"
            >
                <RefreshCw size={14} class={syncing ? 'spinning' : ''} />
            </button>
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
        align-items: flex-start;
        gap: 1ch;
        max-width: 40rem;
        scroll-snap-align: start;
        margin-bottom: 0.25rem;
    }
    .event-time {
        color: var(--txt-2);
        min-width: 7ch;
        flex-shrink: 0;
    }
    .event-details {
        flex: 1 1 auto;
        min-width: 0;
    }
    .event-title:hover {
        color: var(--txt-1);
    }
    .event-meta {
        display: flex;
        align-items: center;
        gap: 1ch;
        font-size: 0.8rem;
        color: var(--txt-3);
    }
    .event-video {
        display: inline-flex;
        align-items: center;
        color: var(--txt-3);
    }
    .event-video:hover {
        color: var(--txt-1);
    }
    .video-icon {
        width: 14px;
        height: 14px;
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

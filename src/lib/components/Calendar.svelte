<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import { settings } from '../stores/settings-store.svelte.js'
    import { isChrome } from '../utils/browser-detect.js'
    import GoogleCalendarAPI from '../api/google-calendar-api.js'

    let { class: className = '' } = $props()

    let events = $state([])
    let loading = $state(false)
    let error = $state('')
    let initialLoad = $state(true)
    let noCalendarsSelected = $state(false)

    const calendarApi = new GoogleCalendarAPI()

    function clampMaxEvents(value) {
        const parsed = parseInt(value, 10)
        if (Number.isNaN(parsed)) return 5
        return Math.min(20, Math.max(1, parsed))
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            loadEvents()
        }
    }

    $effect(() => {
        settings.googleCalendarSignedIn
        settings.googleCalendarMaxEvents
        settings.googleCalendarVisibleCalendarIds
        settings.timeFormat

        if (untrack(() => initialLoad)) {
            initialLoad = false
            return
        }

        loadEvents(true)
    })

    function formatEventDate(date, allDay) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        let dayLabel = eventDay
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            .toLowerCase()

        if (eventDay.getTime() === today.getTime()) dayLabel = 'today'
        if (eventDay.getTime() === tomorrow.getTime()) dayLabel = 'tmrw'

        if (allDay) {
            return `${dayLabel} all day`
        }

        const use12Hour = settings.timeFormat === '12hr'
        const timeLabel = date
            .toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: use12Hour,
            })
            .toLowerCase()

        return `${dayLabel} ${timeLabel}`
    }

    export async function loadEvents(showLoading = false) {
        if (!isChrome()) {
            error = 'google calendar only works in chrome'
            events = []
            noCalendarsSelected = false
            loading = false
            return
        }

        if (!settings.googleCalendarSignedIn) {
            error = 'not signed in to google calendar'
            events = []
            noCalendarsSelected = false
            loading = false
            return
        }

        if (
            Array.isArray(settings.googleCalendarVisibleCalendarIds) &&
            settings.googleCalendarVisibleCalendarIds.length === 0
        ) {
            error = ''
            events = []
            noCalendarsSelected = true
            loading = false
            return
        }

        if (showLoading) loading = true
        error = ''
        noCalendarsSelected = false

        try {
            const maxEvents = clampMaxEvents(settings.googleCalendarMaxEvents)
            events = await calendarApi.getUpcomingEvents(
                maxEvents,
                settings.googleCalendarVisibleCalendarIds
            )
        } catch (err) {
            if (err.message?.includes('Authentication expired')) {
                settings.googleCalendarSignedIn = false
                error = 'google sign in expired'
            } else {
                error = 'failed to load calendar'
            }
            console.error('calendar sync failed:', err)
        } finally {
            if (showLoading) loading = false
        }
    }

    export function refreshCalendar() {
        loadEvents(true)
    }

    onMount(() => {
        loadEvents(true)
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="panel-wrapper {className}">
    <button class="widget-label" onclick={refreshCalendar} disabled={loading}>
        {loading ? 'loading...' : 'calendar'}
    </button>
    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else if noCalendarsSelected}
            <div class="dark">no calendars selected</div>
        {:else if events.length === 0}
            <div class="dark">no upcoming events</div>
        {:else}
            <div class="events">
                {#each events as event}
                    <div class="event">
                        <div class="event-time">
                            {formatEventDate(event.start, event.allDay)}
                        </div>
                        {#if event.link}
                            <a
                                class="event-title bright"
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {event.title}
                            </a>
                        {:else}
                            <div class="event-title bright">{event.title}</div>
                        {/if}
                        {#if event.location}
                            <div class="event-location">{event.location}</div>
                        {/if}
                        {#if !event.calendarPrimary}
                            <div class="event-calendar">#{event.calendarName}</div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex: 1;
        min-width: 0;
    }
    .events {
        display: grid;
        gap: 0.5rem;
        max-height: 15rem;
        overflow: auto;
        scrollbar-width: none;
    }
    .event {
        min-width: 0;
    }
    .event-time {
        color: var(--txt-3);
    }
    .event-title {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .event-location {
        color: var(--txt-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .event-calendar {
        color: var(--txt-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>

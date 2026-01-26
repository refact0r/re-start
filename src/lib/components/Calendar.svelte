<script>
    import { onMount } from 'svelte'
    import { settings } from '../stores/settings-store.svelte.js'
    import GoogleCalendarBackend from '../backends/google-calendar-backend.js'

    let { class: className = '' } = $props()

    let events = $state([])
    let loading = $state(false)
    let error = $state(null)

    // Check if we have credentials and are signed in
    let hasCredentials = $derived(
        settings.googleCalendarClientId && settings.googleCalendarClientSecret
    )
    let isSignedIn = $derived(hasCredentials && settings.googleCalendarRefreshToken)

    async function loadEvents() {
        if (!isSignedIn) return

        loading = true
        error = null

        try {
            const backend = new GoogleCalendarBackend(
                settings.googleCalendarClientId,
                settings.googleCalendarClientSecret
            )

            // Get fresh access token
            const { accessToken } = await backend.refreshAccessToken(
                settings.googleCalendarRefreshToken
            )

            // Fetch today's events
            events = await backend.getTodayEvents(accessToken)
        } catch (err) {
            console.error('Failed to load calendar events:', err)
            if (err.message === 'ACCESS_TOKEN_EXPIRED' || err.message.includes('Token refresh failed')) {
                error = 'session expired - please sign in again'
                // Clear the invalid refresh token
                settings.googleCalendarRefreshToken = ''
            } else {
                error = 'failed to load events'
            }
        } finally {
            loading = false
        }
    }

    function formatTime(dateString, allDay) {
        if (allDay) return 'all day'
        
        const date = new Date(dateString)
        const hours = date.getHours()
        const minutes = date.getMinutes()
        
        if (settings.timeFormat === '24hr') {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } else {
            const period = hours >= 12 ? 'pm' : 'am'
            const hour12 = hours % 12 || 12
            if (minutes === 0) {
                return `${hour12}${period}`
            }
            return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`
        }
    }

    function isEventPast(event) {
        if (event.allDay) return false
        const endTime = new Date(event.end)
        return endTime < new Date()
    }

    function isEventNow(event) {
        if (event.allDay) {
            // All-day events are "now" all day
            return true
        }
        const now = new Date()
        const startTime = new Date(event.start)
        const endTime = new Date(event.end)
        return now >= startTime && now < endTime
    }

    onMount(() => {
        if (isSignedIn) {
            loadEvents()
        }
    })

    // Reload events when sign-in state changes
    $effect(() => {
        if (isSignedIn) {
            loadEvents()
        } else {
            events = []
        }
    })
</script>

<div class="panel-wrapper {className}">
    <button class="widget-label" onclick={loadEvents} disabled={loading || !isSignedIn}>
        {loading ? 'loading...' : 'calendar'}
    </button>

    <div class="panel">
        {#if !hasCredentials}
            <div class="message">
                <button class="sign-in-link" onclick={() => window.dispatchEvent(new CustomEvent('open-settings'))}>
                    upload credentials in settings
                </button>
            </div>
        {:else if !isSignedIn}
            <div class="message">
                <button class="sign-in-link" onclick={() => window.dispatchEvent(new CustomEvent('open-settings'))}>
                    sign in to google calendar
                </button>
            </div>
        {:else if error}
            <div class="error">{error}</div>
        {:else if events.length === 0}
            <div class="message">no events today</div>
        {:else}
            <div class="events">
                {#each events as event}
                    <div 
                        class="event" 
                        class:past={isEventPast(event)}
                        class:now={isEventNow(event)}
                    >
                        <span class="time">{formatTime(event.start, event.allDay)}</span>
                        <span class="title">{event.title}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
    }
    .panel-wrapper.expand {
        flex-grow: 1;
    }
    .message {
        color: var(--txt-3);
    }
    .sign-in-link {
        color: var(--txt-link);
        text-decoration: none;
    }
    .sign-in-link:hover {
        color: var(--txt-1);
    }
    .events {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .event {
        display: flex;
        gap: 1rem;
    }
    .event.past {
        opacity: 0.5;
    }
    .event.now .title {
        color: var(--txt-1);
    }
    .time {
        color: var(--txt-3);
        min-width: 5rem;
        text-align: right;
    }
    .title {
        color: var(--txt-2);
    }
</style>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { createCalendarBackend } from '../backends/index'
    import { settings } from '../settings-store.svelte'
    import { authStore } from '../stores/auth-store'
    import type { AuthStatus } from '../stores/auth-store'
    import { hasMeetScope, signIn, refreshScopes } from '../backends/google-auth'
    import { Panel, Text, Row, Link, Modal, ScrollList, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'
    import EventItem from './EventItem.svelte'
    import CopyableLink from './CopyableLink.svelte'
    import type GoogleCalendarBackend from '../backends/google-calendar-backend'
    import type { CalendarEvent } from '../types'
    type VideoProvider = 'meet' | 'teams' | 'zoom' | 'other' | null

    function getVideoProvider(url: string): VideoProvider {
        if (!url) return null
        if (url.includes('meet.google.com') || url.includes('hangouts.google.com')) return 'meet'
        if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams'
        if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom'
        return 'other'
    }

    let api: GoogleCalendarBackend | null = null
    let events = $state<CalendarEvent[]>([])
    let syncing = $state(true)
    let error = $state('')
    let eventCount = $derived(events.length)
    let syncInProgress = false

    // Meet link popup state
    let showMeetPopup = $state(false)
    let meetLink = $state('')
    let meetError = $state('')
    let creatingMeet = $state(false)
    let needsReauth = $state(false)

    async function createInstantMeet(): Promise<void> {
        // First check if we have the required scope
        await refreshScopes()
        if (!hasMeetScope()) {
            needsReauth = true
            showMeetPopup = true
            return
        }

        creatingMeet = true
        meetError = ''
        meetLink = ''
        needsReauth = false
        showMeetPopup = true

        try {
            const link = await api.createMeetLink()
            meetLink = link
        } catch (err) {
            console.error('Failed to create Meet link:', err)
            if (err.message?.includes('403') || err.message?.includes('insufficient')) {
                needsReauth = true
            } else {
                meetError = 'Failed to create meeting'
            }
        } finally {
            creatingMeet = false
        }
    }

    async function handleReauth(): Promise<void> {
        await signIn()
    }

    function closeMeetPopup(): void {
        showMeetPopup = false
        meetLink = ''
        meetError = ''
        needsReauth = false
    }

    function handleVisibilityChange(): void {
        if (document.visibilityState === 'visible' && api) {
            loadEvents()
        }
    }

    $effect(() => {
        const authStatus = $authStore.status
        console.log('[Calendar] Effect triggered:', { authStatus })
        initializeAPI(authStatus)
    })

    async function initializeAPI(authStatus: AuthStatus): Promise<void> {
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

    async function loadEvents(showSyncing = false): Promise<void> {
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

    function formatEventTime(event: CalendarEvent): string {
        if (event.isAllDay) {
            return 'all day'
        }

        const formatTime = (date: Date): string => {
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
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<Panel
    label={syncing ? 'syncing...' : 'agenda'}
    clickableLabel
    onLabelClick={() => loadEvents(true)}
    flex={1}
>
    <Button variant="sync" onclick={() => loadEvents(true)} disabled={syncing} spinning={syncing} title="sync">
        <RefreshCw size={14} />
    </Button>
    {#if error}
        <Text color="error">{error}</Text>
    {:else}
        <Row justify="between" align="center" gap="sm">
            <Link href="https://calendar.google.com" target="_blank">
                <Text color="primary">{eventCount}</Text> event{eventCount === 1 ? '' : 's'} today
            </Link>
            <Button variant="text" onclick={createInstantMeet} disabled={creatingMeet}>
                + instant conf
            </Button>
        </Row>

        <br />
        <ScrollList maxHeight="none">
            {#each events as event}
                <EventItem
                    time={formatEventTime(event)}
                    title={event.title}
                    href={event.htmlLink}
                    location={event.location}
                    videoLink={event.hangoutLink}
                    videoProvider={getVideoProvider(event.hangoutLink)}
                    past={event.isPast}
                    ongoing={event.isOngoing}
                />
            {/each}
            {#if events.length === 0 && !syncing}
                <Text color="muted">no events today</Text>
            {/if}
        </ScrollList>
    {/if}
</Panel>

<Modal open={showMeetPopup} onClose={closeMeetPopup}>
    {#if needsReauth}
        <Text color="secondary">Additional permissions required to create Meet links.</Text>
        <br /><br />
        <Button variant="primary" onclick={handleReauth}>
            Grant permissions
        </Button>
    {:else if creatingMeet}
        <Text color="secondary">Creating meeting...</Text>
    {:else if meetError}
        <Text color="error">{meetError}</Text>
    {:else if meetLink}
        <Text size="sm" color="muted">Your meeting link:</Text>
        <br /><br />
        <CopyableLink href={meetLink} />
    {/if}
</Modal>

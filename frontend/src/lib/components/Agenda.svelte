<script lang="ts">
    import GoogleCalendarProvider from '../providers/google-calendar-provider'
    import { settings } from '../settings-store.svelte'
    import { authStore, AuthStatus } from '../stores/auth-store'
    import { Panel, Text, Row, Link, ScrollList, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'
    import EventItem from './EventItem.svelte'
    import InstantMeetModal, { createInstantMeet } from './InstantMeetModal.svelte'
    import type { CalendarEvent } from '../types'
    type VideoProvider = 'meet' | 'teams' | 'zoom' | 'other' | null

    function getVideoProvider(url: string): VideoProvider {
        if (!url) return null
        if (
            url.includes('meet.google.com') ||
            url.includes('hangouts.google.com')
        )
            return 'meet'
        if (
            url.includes('teams.microsoft.com') ||
            url.includes('teams.live.com')
        )
            return 'teams'
        if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom'
        return 'other'
    }

    const provider = new GoogleCalendarProvider()
    let events = $state<CalendarEvent[]>(provider.getEvents())
    let syncing = $state(false)
    let eventCount = $derived(events.length)

    // Sync when authenticated and cache is stale
    $effect(() => {
        if (
            $authStore.status === AuthStatus.Authenticated &&
            provider.isCacheStale()
        ) {
            syncEvents()
        }
    })

    async function syncEvents(): Promise<void> {
        if (syncing) return
        syncing = true

        try {
            await provider.sync(settings.selectedCalendars)
            events = provider.getEvents()
        } catch (err) {
            console.error('Failed to sync calendar:', err)
        } finally {
            syncing = false
        }
    }

    function formatEventTime(event: CalendarEvent): string {
        if (event.isAllDay) {
            return 'all day'
        }

        const formatTime = (date: Date): string => {
            if (settings.timeFormat === '12hr') {
                return date
                    .toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    })
                    .toLowerCase()
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

</script>

<svelte:document onvisibilitychange={syncEvents} />

<Panel
    label={syncing ? 'syncing...' : 'agenda'}
    clickableLabel
    onLabelClick={syncEvents}
    flex={1}
>
    <Button
        variant="sync"
        onclick={syncEvents}
        disabled={syncing}
        spinning={syncing}
        title="sync"
    >
        <RefreshCw size={14} />
    </Button>
    {#if $authStore.status === AuthStatus.Unauthenticated}
        <Text color="error">not signed in to google</Text>
    {:else}
        <Row justify="between" align="center" gap="sm">
            <Link href="https://calendar.google.com" target="_blank">
                <Text color="primary">{eventCount}</Text> event{eventCount === 1
                    ? ''
                    : 's'} today
            </Link>
            <Button variant="text" onclick={() => createInstantMeet(provider)}>
                + instant conf
            </Button>
        </Row>

        <br />
        <ScrollList maxHeight="none">
            {#each events as event (event.id)}
                <EventItem
                    time={formatEventTime(event)}
                    title={event.title}
                    href={event.htmlLink || ''}
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

<InstantMeetModal />

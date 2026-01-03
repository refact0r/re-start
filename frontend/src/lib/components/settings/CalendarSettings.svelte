<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import { createCalendarBackend } from '../../backends/index'
    import type { GoogleCalendar } from '../../types'
    import { Checkbox, FormGroup, Text } from '../ui'
    import CalendarList from './CalendarList.svelte'

    let availableCalendars = $state<GoogleCalendar[]>([])
    let loadingCalendars = $state(false)

    export function fetchCalendars(): void {
        if (!settings.googleTasksSignedIn) return

        loadingCalendars = true
        const calendarApi = createCalendarBackend()
        calendarApi
            .fetchCalendarList()
            .then((calendars) => {
                availableCalendars = calendars
            })
            .catch((err) => {
                console.error('Failed to fetch calendars:', err)
                availableCalendars = []
            })
            .finally(() => {
                loadingCalendars = false
            })
    }
</script>

{#if settings.googleTasksSignedIn}
    <FormGroup>
        <Checkbox bind:checked={settings.showCalendar}>enabled</Checkbox>
    </FormGroup>

    {#if settings.showCalendar}
        <FormGroup label="calendars">
            <CalendarList
                calendars={availableCalendars}
                bind:selectedCalendars={settings.selectedCalendars}
                loading={loadingCalendars}
            />
        </FormGroup>
    {/if}
{:else}
    <Text color="muted">sign in to google in integrations tab</Text>
{/if}

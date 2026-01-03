<script lang="ts">
    import type { GoogleCalendar } from '../../types'
    import { Button, Column, Row, Text, ColorSwatch } from '../ui'

    let {
        calendars,
        selectedCalendars = $bindable(),
        loading = false,
    }: {
        calendars: GoogleCalendar[]
        selectedCalendars: string[]
        loading?: boolean
    } = $props()

    function toggleCalendar(calendarId: string): void {
        if (selectedCalendars.includes(calendarId)) {
            selectedCalendars = selectedCalendars.filter(
                (id) => id !== calendarId
            )
        } else {
            selectedCalendars = [...selectedCalendars, calendarId]
        }
    }

    function isSelected(calendarId: string): boolean {
        return (
            selectedCalendars.length === 0 ||
            selectedCalendars.includes(calendarId)
        )
    }
</script>

{#if loading}
    <Text color="muted">loading...</Text>
{:else if calendars.length === 0}
    <Text color="muted">no calendars found</Text>
{:else}
    <Column gap="sm">
        {#each calendars as calendar (calendar.id)}
            <Button variant="text" onclick={() => toggleCalendar(calendar.id)}>
                <Row gap="sm" align="center">
                    <Text color="secondary"
                        >{isSelected(calendar.id) ? '[x]' : '[ ]'}</Text
                    >
                    <ColorSwatch colors={[calendar.color]} size="sm" rounded />
                    <Text flex>{calendar.name}</Text>
                    {#if calendar.primary}
                        <Text size="sm" color="muted">(primary)</Text>
                    {/if}
                </Row>
            </Button>
        {/each}
    </Column>
    {#if selectedCalendars.length === 0}
        <Text size="sm" color="muted">all calendars shown</Text>
    {/if}
{/if}

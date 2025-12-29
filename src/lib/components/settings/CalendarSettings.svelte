<script>
    import { settings } from '../../settings-store.svelte.js'
    import { createCalendarBackend } from '../../backends/index.js'

    let availableCalendars = $state([])
    let loadingCalendars = $state(false)

    export function fetchCalendars() {
        if (!settings.googleTasksSignedIn) return

        loadingCalendars = true
        const calendarApi = createCalendarBackend()
        calendarApi.fetchCalendarList()
            .then(calendars => {
                availableCalendars = calendars
            })
            .catch(err => {
                console.error('Failed to fetch calendars:', err)
                availableCalendars = []
            })
            .finally(() => {
                loadingCalendars = false
            })
    }

    function toggleCalendar(calendarId) {
        if (settings.selectedCalendars.includes(calendarId)) {
            settings.selectedCalendars = settings.selectedCalendars.filter(id => id !== calendarId)
        } else {
            settings.selectedCalendars = [...settings.selectedCalendars, calendarId]
        }
    }
</script>

{#if settings.googleTasksSignedIn}
    <div class="group">
        <button class="checkbox-label" onclick={() => settings.showCalendar = !settings.showCalendar}>
            <span class="checkbox">{settings.showCalendar ? '[x]' : '[ ]'}</span>
            enabled
        </button>
    </div>

    {#if settings.showCalendar}
        <div class="group">
            <div class="setting-label">calendars</div>
            {#if loadingCalendars}
                <div class="calendar-loading">loading...</div>
            {:else if availableCalendars.length === 0}
                <div class="calendar-loading">no calendars found</div>
            {:else}
                <div class="calendar-list">
                    {#each availableCalendars as calendar}
                        <button class="checkbox-label calendar-item" onclick={() => toggleCalendar(calendar.id)}>
                            <span class="checkbox">{settings.selectedCalendars.length === 0 || settings.selectedCalendars.includes(calendar.id) ? '[x]' : '[ ]'}</span>
                            <span
                                class="calendar-color"
                                style="background-color: {calendar.color}"
                            ></span>
                            <span class="calendar-name">{calendar.name}</span>
                            {#if calendar.primary}
                                <span class="calendar-primary">(primary)</span>
                            {/if}
                        </button>
                    {/each}
                </div>
                {#if settings.selectedCalendars.length === 0}
                    <div class="calendar-hint">all calendars shown</div>
                {/if}
            {/if}
        </div>
    {/if}
{:else}
    <div class="calendar-not-signed-in">
        sign in to google in integrations tab
    </div>
{/if}

<style>
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        text-align: left;
    }
    .checkbox-label .checkbox {
        color: var(--txt-2);
    }
    .calendar-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .calendar-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .calendar-color {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .calendar-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .calendar-primary {
        color: var(--txt-3);
        font-size: 0.75rem;
    }
    .calendar-loading {
        color: var(--txt-3);
    }
    .calendar-hint {
        color: var(--txt-3);
        font-size: 0.75rem;
        margin-top: 0.5rem;
    }
    .calendar-not-signed-in {
        color: var(--txt-3);
    }
</style>

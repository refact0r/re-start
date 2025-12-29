<script>
    import { fade, fly } from 'svelte/transition'
    import {
        saveSettings,
        settings,
        resetSettings,
    } from '../settings-store.svelte.js'
    import { Paintbrush, Plug, Clock, Sun, SquareCheck, Calendar, Link } from 'lucide-svelte'

    // Import tab components
    import AppearanceSettings from './settings/AppearanceSettings.svelte'
    import IntegrationsSettings from './settings/IntegrationsSettings.svelte'
    import ClockSettings from './settings/ClockSettings.svelte'
    import WeatherSettings from './settings/WeatherSettings.svelte'
    import TasksSettings from './settings/TasksSettings.svelte'
    import CalendarSettings from './settings/CalendarSettings.svelte'
    import LinksSettings from './settings/LinksSettings.svelte'

    let { showSettings = false, closeSettings, refreshBackground = null, background = null } = $props()

    const tabs = [
        { id: 'appearance', icon: Paintbrush, title: 'Appearance' },
        { id: 'integrations', icon: Plug, title: 'Integrations' },
        { id: 'clock', icon: Clock, title: 'Clock' },
        { id: 'weather', icon: Sun, title: 'Weather' },
        { id: 'tasks', icon: SquareCheck, title: 'Tasks' },
        { id: 'calendar', icon: Calendar, title: 'Calendar' },
        { id: 'links', icon: Link, title: 'Links' }
    ]
    let activeTab = $state('appearance')
    let tabElements = $state({})
    let indicatorStyle = $state('')

    // Calendar settings reference for fetching calendars
    let calendarSettingsRef = $state(null)

    $effect(() => {
        const el = tabElements[activeTab]
        if (el) {
            indicatorStyle = `left: ${el.offsetLeft}px; width: ${el.offsetWidth}px`
        }
    })

    // Fetch calendars when settings opens and user is signed in
    $effect(() => {
        if (showSettings && settings.googleTasksSignedIn && settings.showCalendar && calendarSettingsRef) {
            calendarSettingsRef.fetchCalendars()
        }
    })

    // @ts-ignore
    const version = __APP_VERSION__

    function handleClose() {
        saveSettings(settings)
        closeSettings()
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            handleClose()
        }
    }

    function handleReset() {
        if (
            confirm('are you sure you want to reset all settings to default?')
        ) {
            resetSettings()
            saveSettings(settings)
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showSettings}
    <div
        class="backdrop"
        onclick={handleClose}
        onkeydown={(e) => e.key === 'Enter' && handleClose()}
        role="button"
        tabindex="0"
        transition:fade={{ duration: 200 }}
    ></div>

    <div class="settings" transition:fly={{ x: 640, duration: 200 }}>
        <div class="header">
            <h2>settings</h2>
            <button class="close-btn" onclick={handleClose}>x</button>
        </div>

        <nav class="tabs">
            {#each tabs as tab}
                <button
                    class="tab"
                    class:active={activeTab === tab.id}
                    onclick={() => activeTab = tab.id}
                    title={tab.title}
                    bind:this={tabElements[tab.id]}
                >
                    <tab.icon size={18} strokeWidth={2} />
                </button>
            {/each}
            <div class="tab-indicator" style={indicatorStyle}></div>
        </nav>

        <div class="content">
            {#if activeTab === 'appearance'}
                <AppearanceSettings {refreshBackground} {background} />
            {:else if activeTab === 'integrations'}
                <IntegrationsSettings />
            {:else if activeTab === 'clock'}
                <ClockSettings />
            {:else if activeTab === 'weather'}
                <WeatherSettings />
            {:else if activeTab === 'tasks'}
                <TasksSettings />
            {:else if activeTab === 'calendar'}
                <CalendarSettings bind:this={calendarSettingsRef} />
            {:else if activeTab === 'links'}
                <LinksSettings />
            {/if}

            <!-- FOOTER -->
            <div class="version">
                re-start
                <a href="https://github.com/refact0r/re-start" target="_blank">
                    {#if version}v{version}
                    {/if}</a
                >
                • made with love by
                <a href="https://refact0r.dev" target="_blank">refact0r</a>
                •
                <button class="reset-link" onclick={handleReset}
                    >reset settings</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
    }
    .settings {
        position: fixed;
        top: 0;
        right: 0;
        width: 40rem;
        height: 100%;
        background: var(--bg-1);
        border-left: 2px solid var(--bg-3);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }
    .header {
        padding: 0.75rem 1rem 0.75rem 1.5rem;
        border-bottom: 2px solid var(--bg-3);
        display: flex;
        justify-content: space-between;
        align-items: center;

        h2 {
            margin: 0;
        }
    }
    .close-btn {
        padding: 0 0.5rem;
        font-size: 1.5rem;
        line-height: 2.25rem;
        font-weight: 300;
    }
    .tabs {
        position: relative;
        display: flex;
        border-bottom: 2px solid var(--bg-3);
        padding: 0 1rem;
    }
    .tab {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: var(--txt-3);
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.15s ease;
    }
    .tab:hover {
        color: var(--txt-2);
    }
    .tab.active {
        color: var(--txt-1);
    }
    .tab-indicator {
        position: absolute;
        bottom: -2px;
        height: 2px;
        background: var(--txt-2);
        transition: left 0.2s ease, width 0.2s ease;
    }
    .content {
        flex: 1;
        width: 100%;
        padding: 1.5rem;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-1);
        box-sizing: border-box;
    }
    .version {
        color: var(--txt-3);

        a {
            color: var(--txt-2);
        }
        a:hover {
            color: var(--txt-1);
        }
    }
    .reset-link {
        background: none;
        border: none;
        color: var(--txt-2);
        cursor: pointer;
        padding: 0;
        font-size: inherit;
        font-family: inherit;
    }
    .reset-link:hover {
        color: var(--txt-1);
    }
</style>

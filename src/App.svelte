<script>
    import { onMount, onDestroy } from 'svelte'
    import Todoist from './lib/components/Todoist.svelte'
    import Weather from './lib/components/Weather.svelte'
    import Links from './lib/components/Links.svelte'
    import Clock from './lib/components/Clock.svelte'
    import Stats from './lib/components/Stats.svelte'
    import Settings from './lib/components/Settings.svelte'
    import { settings } from './lib/settings-store.svelte.js'
    import '@fontsource-variable/geist-mono'

    let showSettings = $state(false)
    let weatherComponent
    let todoistComponent

    function closeSettings() {
        showSettings = false
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            if (weatherComponent) {
                weatherComponent.loadWeather()
            }
            if (todoistComponent) {
                todoistComponent.loadTasks()
            }
        }
    }

    onMount(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<main>
    <div class="container">
        <div class="top">
            <Clock />
            <Stats />
        </div>
        <div class="widgets">
            <Weather bind:this={weatherComponent} />
            <Todoist bind:this={todoistComponent} />
        </div>
        <Links />
    </div>

    <button
        class="settings-btn"
        onclick={() => (showSettings = true)}
        aria-label="Open settings"
    >
        settings
    </button>

    <Settings {showSettings} {closeSettings} />
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        justify-content: center;
        align-items: center;
    }
    .container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .top,
    .widgets {
        display: flex;
        gap: 1.5rem;
    }
    .settings-btn {
        position: fixed;
        top: 0;
        right: 0;
        padding: 1rem 1.5rem;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 100;
        color: var(--txt-3);
    }
    .settings-btn:hover {
        opacity: 1;
    }
</style>

<script>
    import Todoist from './lib/components/Todoist.svelte'
    import Weather from './lib/components/Weather.svelte'
    import Links from './lib/components/Links.svelte'
    import Clock from './lib/components/Clock.svelte'
    import Stats from './lib/components/Stats.svelte'
    import Settings from './lib/components/Settings.svelte'
    import '@fontsource-variable/geist-mono'

    let showSettings = $state(false)

    function closeSettings() {
        showSettings = false
    }
</script>

<main>
    <div class="container">
        <div class="top">
            <Clock />
            <Stats />
        </div>
        <div class="widgets">
            <Weather />
            <Todoist />
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

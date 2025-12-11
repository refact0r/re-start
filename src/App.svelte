<script>
    import '@fontsource-variable/geist-mono'
    import { settings } from './lib/settings-store.svelte.js'
    import { themes } from './lib/themes.js'
    import Clock from './lib/components/Clock.svelte'
    import Links from './lib/components/Links.svelte'
    import Settings from './lib/components/Settings.svelte'
    import Stats from './lib/components/Stats.svelte'
    import Tasks from './lib/components/Tasks.svelte'
    import Weather from './lib/components/Weather.svelte'
    import { saveSettings } from './lib/settings-store.svelte.js'

    let showSettings = $state(false)

    let needsConfiguration = $derived(
        (settings.locationMode === 'manual' &&
            (settings.latitude === null || settings.longitude === null)) ||
            (settings.taskBackend === 'todoist' && !settings.todoistApiToken)
    )

    function closeSettings() {
        showSettings = false
    }

    function applyTheme(themeName) {
        const theme = themes[themeName] || themes['defaultTheme']
        const root = document.documentElement
        for (const [key, value] of Object.entries(theme.colors)) {
            root.style.setProperty(key, value)
        }
    }

    $effect(() => {
        const fontName = settings.font?.trim() || 'Geist Mono Variable'
        document.documentElement.style.setProperty(
            '--font-family',
            `'${fontName}', monospace`
        )
    })

    $effect(() => {
        applyTheme(settings.currentTheme)
    })

    $effect(() => {
        document.title = settings.tabTitle || '~'
    })

    $effect(() => {
        let styleEl = document.getElementById('custom-css')
        if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'custom-css'
            document.head.appendChild(styleEl)
        }
        styleEl.textContent = settings.customCSS || ''
    })

    $effect(() => {
        saveSettings(settings)
    })
</script>

<main>
    <div class="container">
        <div class="top">
            <Clock />
            <Stats />
        </div>
        <div class="widgets">
            <Weather />
            <Tasks />
        </div>
        <Links />
    </div>

    <button
        class="settings-btn"
        class:needs-config={needsConfiguration}
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
        padding: 2rem 1rem;
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
    .settings-btn.needs-config {
        opacity: 1;
        animation: pulse 2s ease-in-out infinite;
    }
    .settings-btn.needs-config:hover {
        opacity: 1;
        animation: none;
    }
</style>

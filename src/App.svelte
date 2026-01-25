<script>
    import '@fontsource-variable/geist-mono'
    import { settings } from './lib/stores/settings-store.svelte.js'
    import { defaultTheme } from './lib/config/themes.js'
    import Clock from './lib/components/Clock.svelte'
    import Links from './lib/components/Links.svelte'
    import Notes from './lib/components/Notes.svelte'
    import Pomodoro from './lib/components/Pomodoro.svelte'
    import Quote from './lib/components/Quote.svelte'
    import Settings from './lib/components/Settings.svelte'
    import Stats from './lib/components/Stats.svelte'
    import Tasks from './lib/components/Tasks.svelte'
    import Weather from './lib/components/Weather.svelte'
    import { saveSettings } from './lib/stores/settings-store.svelte.js'
    import { isChrome } from './lib/utils/browser-detect.js'

    let showSettings = $state(false)

    // Check if Google Tasks is available (Chrome only)
    const googleTasksAvailable = isChrome()

    let needsConfiguration = $derived(
        (settings.locationMode === 'manual' &&
            (settings.latitude === null || settings.longitude === null)) ||
            (settings.taskBackend === 'todoist' && !settings.todoistApiToken) ||
            (settings.taskBackend === 'google-tasks' &&
                googleTasksAvailable &&
                !settings.googleTasksSignedIn)
    )

    function closeSettings() {
        showSettings = false
    }

    function applyTheme(themeName) {
        document.documentElement.className = 'theme-' + (themeName || defaultTheme)
    }

    // Google Fonts that can be loaded dynamically
    const googleFonts = {
        'JetBrains Mono': 'JetBrains+Mono',
        'Fira Code': 'Fira+Code',
        'Source Code Pro': 'Source+Code+Pro',
        'IBM Plex Mono': 'IBM+Plex+Mono',
        'Roboto Mono': 'Roboto+Mono',
        'Inconsolata': 'Inconsolata',
        'Ubuntu Mono': 'Ubuntu+Mono',
        'Space Mono': 'Space+Mono',
    }

    $effect(() => {
        const fontName = settings.font?.trim() || 'Geist Mono Variable'

        // Load from Google Fonts if available
        if (googleFonts[fontName]) {
            const linkId = 'google-font-link'
            let link = document.getElementById(linkId)
            if (!link) {
                link = document.createElement('link')
                link.id = linkId
                link.rel = 'stylesheet'
                document.head.appendChild(link)
            }
            link.href = `https://fonts.googleapis.com/css2?family=${googleFonts[fontName]}:wght@400;500;700&display=swap`
        }

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
        {#if settings.showLinks}
            <Links />
        {/if}
        {#if settings.showClock || settings.showPomodoro || settings.showStats}
            <div class="top">
                {#if settings.showClock}
                    <Clock />
                {/if}
                {#if settings.showPomodoro}
                    <Pomodoro />
                {/if}
                {#if settings.showStats}
                    <Stats />
                {/if}
            </div>
        {/if}
        {#if settings.showWeather || settings.showTasks || settings.showNotes}
            <div class="widgets">
                {#if settings.showWeather}
                    <Weather />
                {/if}
                {#if settings.showTasks}
                    <Tasks />
                {/if}
                {#if settings.showNotes}
                    <Notes />
                {/if}
            </div>
        {/if}
        {#if settings.showQuote}
            <Quote />
        {/if}
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
        z-index: 100;
        color: var(--txt-3);
    }
    .settings-btn:hover {
        opacity: 1;
    }
    .settings-btn.needs-config {
        opacity: 1;
        animation: pulse 1s ease-in-out infinite;
    }
    .settings-btn.needs-config:hover {
        opacity: 1;
        animation: none;
    }
</style>

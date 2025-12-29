<script>
    import '@fontsource-variable/geist-mono'
    import { settings } from './lib/settings-store.svelte.js'
    import { themes } from './lib/themes.js'
    import { getBackground, loadCachedBackground, forceRefreshBackground } from './lib/unsplash-api.js'
    import { handleAuthCallback, tryRestoreSession } from './lib/backends/google-auth.js'
    import Calendar from './lib/components/Calendar.svelte'
    import Clock from './lib/components/Clock.svelte'
    import Links from './lib/components/Links.svelte'
    import Settings from './lib/components/Settings.svelte'
    import Stats from './lib/components/Stats.svelte'
    import Tasks from './lib/components/Tasks.svelte'
    import Weather from './lib/components/Weather.svelte'
    import { saveSettings } from './lib/settings-store.svelte.js'
    import { Settings as SettingsIcon } from 'lucide-svelte'

    let showSettings = $state(false)
    let background = $state(null)
    let thumbLoaded = $state(false)
    let fullLoaded = $state(false)

    let needsConfiguration = $derived(
        (settings.locationMode === 'manual' &&
            (settings.latitude === null || settings.longitude === null)) ||
            (settings.taskBackend === 'todoist' && !settings.todoistApiToken) ||
            (settings.taskBackend === 'google-tasks' &&
                !settings.googleTasksSignedIn)
    )

    function closeSettings() {
        showSettings = false
    }

    function applyTheme(themeName) {
        const theme = themes[themeName] || themes['default']
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

    // Handle OAuth callback on page load (runs once)
    console.log('[App] Checking for OAuth callback...')
    const authResult = handleAuthCallback()
    if (authResult?.success) {
        console.log('[App] OAuth callback success, marking user as signed in')
        settings.googleTasksSignedIn = true
        saveSettings(settings)
    } else if (authResult?.error) {
        console.error('[App] Auth error:', authResult.error)
    }

    // Try to restore Google session if user was previously signed in
    console.log('[App] googleTasksSignedIn from settings:', settings.googleTasksSignedIn)
    if (settings.googleTasksSignedIn && !authResult) {
        console.log('[App] User was previously signed in, attempting session restore...')
        tryRestoreSession().then((restored) => {
            if (restored) {
                console.log('[App] Session restore succeeded')
            } else {
                console.log('[App] Session restore failed, marking user as signed out')
                settings.googleTasksSignedIn = false
                saveSettings(settings)
            }
        })
    }

    // Toggle body class for background blur effect
    $effect(() => {
        if (settings.showBackground && background) {
            document.body.classList.add('has-background')
        } else {
            document.body.classList.remove('has-background')
        }
    })

    // Background image loading
    $effect(() => {
        if (!settings.showBackground) {
            background = null
            thumbLoaded = false
            fullLoaded = false
            return
        }

        // Load cached first for instant display
        const cached = loadCachedBackground()
        if (cached) {
            background = cached
        }

        // Then fetch (will return cached if still valid, or fetch new)
        getBackground(settings.unsplashApiKey)
            .then((bg) => {
                background = bg
            })
            .catch((err) => {
                console.error('Failed to load background:', err)
            })
    })

    function handleThumbLoad() {
        thumbLoaded = true
    }

    function handleFullLoad() {
        fullLoaded = true
    }

    // Expose refresh function for Settings component
    async function refreshBackground() {
        thumbLoaded = false
        fullLoaded = false
        background = await forceRefreshBackground(settings.unsplashApiKey)
    }
</script>

<main>
    {#if settings.showBackground && background}
        <div
            class="background"
            style="--bg-opacity: {settings.backgroundOpacity}; --bg-color: {background.color || '#000'}"
        >
            <!-- Thumbnail: shows immediately, stays visible under full -->
            <img
                class="thumb"
                class:loaded={thumbLoaded}
                src={background.thumbUrl}
                alt={background.description || 'Background'}
                onload={handleThumbLoad}
            />
            <!-- Full resolution: only starts loading after thumb is visible -->
            {#if thumbLoaded}
                <img
                    class="full"
                    class:loaded={fullLoaded}
                    src={background.fullUrl}
                    alt={background.description || 'Background'}
                    onload={handleFullLoad}
                />
            {/if}
        </div>
        <a
            class="attribution"
            href={background.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
        >
            Photo by {background.photographer.name} on Unsplash
        </a>
    {/if}

    <div class="container">
        <div class="top">
            <Clock />
            <Stats />
        </div>
        <div class="widgets">
            {#if settings.showWeather !== false}
                <Weather />
            {/if}
            {#if settings.showTasks !== false}
                <Tasks />
            {/if}
            {#if settings.googleTasksSignedIn && settings.showCalendar !== false}
                <Calendar />
            {/if}
        </div>
        {#if settings.showLinks !== false}
            <Links />
        {/if}
    </div>

    <button
        class="settings-btn"
        class:needs-config={needsConfiguration}
        onclick={() => (showSettings = true)}
        aria-label="Open settings"
    >
        <SettingsIcon size={20} strokeWidth={2} />
    </button>

    <Settings {showSettings} {closeSettings} {refreshBackground} {background} />
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        justify-content: center;
        align-items: center;
        padding: 2rem 1rem;
        position: relative;
    }

    .background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        background-color: var(--bg-color);
        overflow: hidden;
    }

    .background img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
    }

    .background img.thumb.loaded {
        opacity: var(--bg-opacity);
    }

    .background img.full {
        transition: opacity 0.8s ease;
    }

    .background img.full.loaded {
        opacity: var(--bg-opacity);
    }

    .attribution {
        position: fixed;
        bottom: 0.5rem;
        left: 0.5rem;
        font-size: 0.7rem;
        color: var(--txt-4);
        opacity: 0;
        transition: opacity 0.2s ease;
        text-decoration: none;
        z-index: 10;
    }

    .attribution:hover {
        opacity: 1;
        color: var(--txt-3);
    }
    .container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
    }
    .top,
    .widgets {
        display: contents;
    }
    .settings-btn {
        position: fixed;
        top: 0;
        right: 0;
        padding: 1rem 1.5rem;
        opacity: 0.15;
        z-index: 100;
        color: var(--txt-3);
        transition: opacity 0.2s ease, color 0.2s ease;
    }
    .settings-btn:hover {
        opacity: 1;
        color: var(--txt-1);
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

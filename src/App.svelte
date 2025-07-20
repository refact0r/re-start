<script>
    import { onMount, onDestroy } from 'svelte'
    import Todoist from './lib/components/Todoist.svelte'
    import Weather from './lib/components/Weather.svelte'
    import Links from './lib/components/Links.svelte'
    import Settings from './lib/components/Settings.svelte'
    import { settings } from './lib/settings-store.svelte.js'
    import '@fontsource-variable/geist-mono'

    let showSettings = $state(false)

    let loadTime = $state(0)
    let latency = $state(null)
    let viewportWidth = $state(0)
    let viewportHeight = $state(0)
    let fps = $state(0)

    let currentHrs = $state('')
    let currentMin = $state('')
    let currentSec = $state('')
    let currentAmPm = $state('')
    let currentDate = $state('')
    let clockInterval = null

    let weatherComponent
    let todoistComponent

    let frameCount = 0
    let lastTime = 0
    let fpsAnimationId = null

    function updateFPS() {
        frameCount++
        const currentTime = performance.now()

        if (currentTime >= lastTime + 1000) {
            fps = frameCount
            frameCount = 0
            lastTime = currentTime
        }

        fpsAnimationId = requestAnimationFrame(updateFPS)
    }

    function startFPS() {
        if (!fpsAnimationId) {
            frameCount = 0
            lastTime = performance.now()
            updateFPS()
        }
    }

    function stopFPS() {
        if (fpsAnimationId) {
            cancelAnimationFrame(fpsAnimationId)
            fpsAnimationId = null
            fps = 0
        }
    }

    function updateTime() {
        const now = new Date()

        let hours = now.getHours()

        if (settings.timeFormat === '12hr') {
            currentAmPm = hours >= 12 ? 'pm' : 'am'
            hours = hours % 12
            if (hours === 0) hours = 12
        } else {
            currentAmPm = ''
        }

        currentHrs = hours.toString().padStart(2, '0')
        currentMin = now.getMinutes().toString().padStart(2, '0')
        currentSec = now.getSeconds().toString().padStart(2, '0')

        currentDate = now
            .toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            .toLowerCase()
    }

    function startClock() {
        updateTime()

        const now = new Date()
        const msUntilNextSecond = 1000 - now.getMilliseconds()

        setTimeout(() => {
            updateTime()
            clockInterval = setInterval(updateTime, 1000)
        }, msUntilNextSecond)
    }

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
            startFPS()
        } else {
            stopFPS()
        }
    }

    async function measurePing() {
        const start = performance.now()

        try {
            await fetch('https://www.google.com/generate_204', {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
            })
            latency = Math.round(performance.now() - start)
        } catch (error) {
            latency = null
        }
    }

    function updateViewportSize() {
        viewportWidth = window.innerWidth
        viewportHeight = window.innerHeight
    }

    onMount(() => {
        startClock()
        measurePing()
        updateViewportSize()
        startFPS()

        const perfObserver = new PerformanceObserver((list) => {
            const entry = list.getEntries()[0].toJSON()
            loadTime = Math.round(entry.duration)
        })
        perfObserver.observe({ type: 'navigation', buffered: true })

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('resize', updateViewportSize)
    })

    onDestroy(() => {
        if (clockInterval) {
            clearInterval(clockInterval)
        }
        stopFPS()
        window.removeEventListener('resize', updateViewportSize)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<main>
    <div class="container">
        <div class="top">
            <div class="datetime">
                <div class="clock">
                    {currentHrs}<span class="colon">:</span>{currentMin}<span
                        class="colon">:</span
                    >{currentSec}
                    {#if settings.timeFormat === '12hr'}
                        <span class="ampm">{currentAmPm}</span>
                    {/if}
                </div>
                <div class="date">{currentDate}</div>
            </div>
            <div class="stats">
                <div>load {loadTime} ms</div>
                <div>ping {latency || '?'} ms</div>
                <div>{viewportWidth} x {viewportHeight}</div>
                <div>{fps} fps</div>
            </div>
        </div>
        <div class="widgets">
            <div class="weather">
                <Weather bind:this={weatherComponent} />
            </div>
            <div class="todoist">
                <Todoist bind:this={todoistComponent} />
            </div>
        </div>
        <div class="links">
            <Links />
        </div>
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
    .top {
        display: flex;
        gap: 1.5rem;
    }
    .datetime {
        flex: 1;
    }
    .clock {
        margin: 0;
        font-size: 3.25rem;
        font-weight: 300;
        color: var(--txt-1);
        line-height: 3.5rem;
        margin-bottom: 0.5rem;
    }
    .colon,
    .ampm {
        color: var(--txt-2);
    }
    .date {
        margin: 0;
        font-size: 1.5rem;
        color: var(--txt-3);
        line-height: 2rem;
    }
    .widgets {
        display: flex;
        gap: 1.5rem;
    }
    .todoist {
        flex: 1;
    }
    .datetime,
    .weather,
    .todoist,
    .links,
    .stats {
        padding: 1.5rem;
        border: 2px solid var(--bg-3);
        position: relative;

        &::after {
            display: block;
            color: var(--txt-4);
            position: absolute;
            top: -14px;
            left: 8px;
            background-color: var(--bg-1);
            padding: 0 4px;
            z-index: 10;
        }
    }
    .datetime::after {
        content: 'datetime';
    }
    .weather::after {
        content: 'weather';
    }
    .todoist::after {
        content: 'todoist';
    }
    .links::after {
        content: 'links';
    }
    .stats::after {
        content: 'stats';
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

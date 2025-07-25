<script>
    import { onMount, onDestroy } from 'svelte'

    let loadTime = $state(0)
    let latency = $state(null)
    let viewportWidth = $state(0)
    let viewportHeight = $state(0)
    let fps = $state(0)

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

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            startFPS()
            measurePing()
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
        stopFPS()
        window.removeEventListener('resize', updateViewportSize)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="stats panel">
    <div class="panel-label">stats</div>
    <div>load <span class="value">{loadTime} ms</span></div>
    <div>ping <span class="value">{latency || '?'} ms</span></div>
    <div>fps <span class="value">{fps}</span></div>
    <div>
        <span class="value">{viewportWidth}</span> x
        <span class="value">{viewportHeight}</span>
    </div>
</div>

<style>
    .value {
        color: var(--txt-1);
    }
</style>

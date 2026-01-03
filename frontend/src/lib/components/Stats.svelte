<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { Panel, Text } from './ui'

    let loadTime = $state(0)
    let latency = $state<number | null>(null)
    let viewportWidth = $state(0)
    let viewportHeight = $state(0)
    let fps = $state(0)

    let frameCount = 0
    let lastTime = 0
    let fpsAnimationId: number | null = null

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
        } catch (_error) {
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

<Panel label="stats">
    <Text as="div">load <Text color="primary">{loadTime} ms</Text></Text>
    <Text as="div">ping <Text color="primary">{latency || '?'} ms</Text></Text>
    <Text as="div">fps <Text color="primary">{fps}</Text></Text>
    <Text as="div"
        ><Text color="primary">{viewportWidth}</Text> x <Text color="primary"
            >{viewportHeight}</Text
        ></Text
    >
</Panel>

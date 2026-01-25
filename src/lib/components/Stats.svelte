<script>
    import { onMount, onDestroy } from 'svelte'

    let { class: className = '' } = $props()

    let loadTime = $state(0)
    let latency = $state(null)
    let perfObserver = null

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            measurePing()
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

    onMount(() => {
        measurePing()

        perfObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length > 0) {
                const entry = entries[0].toJSON()
                loadTime = Math.round(entry.duration)
            }
        })
        perfObserver.observe({ type: 'navigation', buffered: true })

        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        if (perfObserver) {
            perfObserver.disconnect()
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="panel-wrapper {className}">
    <div class="panel-label">stats</div>
    <div class="panel">
        <div>load <span class="bright">{loadTime} ms</span></div>
        <div>ping <span class="bright">{latency || '?'} ms</span></div>
    </div>
</div>

<style>
    .panel-wrapper.expand {
        flex-grow: 1;
    }
    .panel-wrapper :global(.bright) {
        color: var(--txt-num);
    }
</style>

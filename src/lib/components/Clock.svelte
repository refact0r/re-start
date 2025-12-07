<script>
    import { onMount, onDestroy } from 'svelte'
    import { settings } from '../settings-store.svelte.js'

    let currentHrs = $state('')
    let currentMin = $state('')
    let currentSec = $state('')
    let currentAmPm = $state('')
    let currentDate = $state('')
    let clockInterval = null

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

        const locale = settings.dateFormat === 'dmy' ? 'en-GB' : 'en-US'
        currentDate = new Intl.DateTimeFormat(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
            .format(now)
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

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            startClock()
        } else {
            if (clockInterval) {
                clearInterval(clockInterval)
                clockInterval = null
            }
        }
    }

    onMount(() => {
        startClock()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        if (clockInterval) {
            clearInterval(clockInterval)
        }
    })
</script>

<div class="panel-wrapper">
    <div class="panel-label">datetime</div>
    <div class="panel">
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
</div>

<style>
    .panel-wrapper {
        flex-grow: 1;
    }
    .clock {
        font-size: 3.125rem;
        font-weight: 300;
        color: var(--txt-1);
        line-height: 3.5rem;
        margin: 0 0 0.5rem 0;
    }
    .colon,
    .ampm {
        color: var(--txt-2);
    }
    .date {
        font-size: 1.5rem;
        color: var(--txt-3);
        line-height: 2rem;
        margin: 0;
    }
</style>

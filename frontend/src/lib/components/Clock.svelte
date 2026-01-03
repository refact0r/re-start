<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { settings } from '../settings-store.svelte'
    import { Panel, Text } from './ui'

    let currentHrs = $state('')
    let currentMin = $state('')
    let currentSec = $state('')
    let currentAmPm = $state('')
    let currentDate = $state('')
    let clockInterval: ReturnType<typeof setInterval> | null = null

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

<Panel label="datetime" span={2}>
    <Text as="div" size="3xl" color="primary" weight="light">
        {currentHrs}<Text color="secondary">:</Text>{currentMin}<Text
            color="secondary">:</Text
        >{currentSec}
        {#if settings.timeFormat === '12hr'}
            <Text color="secondary">{currentAmPm}</Text>
        {/if}
    </Text>
    <Text as="div" size="xl" color="muted">{currentDate}</Text>
</Panel>

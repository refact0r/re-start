<script lang="ts">
    import { onMount, onDestroy, untrack } from 'svelte'
    import WeatherAPI from '../weather-api'
    import { settings } from '../settings-store.svelte'
    import { Panel, Text, Row, Column, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'
    import type { ProcessedCurrentWeather, ForecastItem } from '../types'

    let current = $state<ProcessedCurrentWeather | null>(null)
    let forecast = $state<ForecastItem[]>([])
    let syncing = $state(true)
    let error = $state<string | null>(null)
    let initialLoad = $state(true)
    let syncInProgress = false

    const api = new WeatherAPI()

    const cachedData = api.getWeather(settings.timeFormat)
    if (cachedData) {
        current = cachedData.current
        forecast = cachedData.forecast
        syncing = false
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            loadWeather()
        }
    }

    $effect(() => {
        const _lat = settings.latitude
        const _lon = settings.longitude
        const _locationMode = settings.locationMode
        const _tempUnit = settings.tempUnit
        const _speedUnit = settings.speedUnit
        const _timeFormat = settings.timeFormat

        if (untrack(() => initialLoad)) {
            initialLoad = false
            return
        }

        api.invalidateCache()
        loadWeather(true)
    })

    async function getCurrentLocation(): Promise<{
        latitude: number
        longitude: number
    }> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('geolocation not supported'))
                return
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude:
                            Math.round(position.coords.latitude * 100) / 100,
                        longitude:
                            Math.round(position.coords.longitude * 100) / 100,
                    })
                },
                (err) => reject(err),
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            )
        })
    }

    async function getCoordinates(): Promise<{
        latitude: number
        longitude: number
    }> {
        if (settings.locationMode === 'auto') {
            try {
                return await getCurrentLocation()
            } catch (err) {
                console.error('failed to get location:', err)
                throw new Error('failed to get location')
            }
        }

        if (settings.latitude === null || settings.longitude === null) {
            throw new Error('location not configured')
        }

        return { latitude: settings.latitude, longitude: settings.longitude }
    }

    export async function loadWeather(showSyncing = false): Promise<void> {
        if (syncInProgress) return
        syncInProgress = true

        try {
            if (showSyncing) syncing = true
            error = null

            const { latitude, longitude } = await getCoordinates()

            const cachedData = api.getWeather(settings.timeFormat)
            if (cachedData) {
                current = cachedData.current
                forecast = cachedData.forecast
                syncing = false
            }

            if (api.isCacheStale(latitude, longitude) || !cachedData) {
                await api.sync(
                    latitude,
                    longitude,
                    settings.tempUnit,
                    settings.speedUnit
                )
                const freshData = api.getWeather(settings.timeFormat)
                current = freshData.current
                forecast = freshData.forecast
            }
        } catch (err) {
            error = (err as Error).message
            console.error(err)
        } finally {
            syncing = false
            syncInProgress = false
        }
    }

    export function refreshWeather() {
        api.invalidateCache()
        loadWeather(true)
    }

    onMount(() => {
        loadWeather()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<Panel
    label={syncing ? 'syncing...' : 'weather'}
    clickableLabel
    onLabelClick={() => loadWeather(true)}
    flexShrink={0}
    noFade
>
    {#if error}
        <Text color="error">{error}</Text>
    {:else if current}
        <Text as="div" size="2xl" color="primary" weight="light"
            >{current.temperature_2m}°</Text
        >
        <Text as="div" size="lg" color="muted">{current.description}</Text>
        <br />
        <Row gap="lg">
            <Column>
                <Text
                    >humi <Text color="primary"
                        >{current.relative_humidity_2m}%</Text
                    ></Text
                >
                <Text
                    >prec <Text color="primary"
                        >{current.precipitation_probability}%</Text
                    ></Text
                >
            </Column>
            <Column>
                <Text
                    >wind <Text color="primary"
                        >{current.wind_speed_10m} {settings.speedUnit}</Text
                    ></Text
                >
                <Text
                    >feel <Text color="primary"
                        >{current.apparent_temperature}°</Text
                    ></Text
                >
            </Column>
        </Row>
        <br />
        <Row gap="lg">
            <Column>
                {#each forecast as f (f.time)}
                    <Text as="div">{f.formattedTime}</Text>
                {/each}
            </Column>
            <Column>
                {#each forecast as f (f.time)}
                    <Text as="div" color="primary">{f.temperature}°</Text>
                {/each}
            </Column>
            <Column>
                {#each forecast as f (f.time)}
                    <Text as="div" color="muted">{f.description}</Text>
                {/each}
            </Column>
        </Row>
        <Button
            variant="sync"
            onclick={() => loadWeather(true)}
            disabled={syncing}
            spinning={syncing}
            title="sync"
        >
            <RefreshCw size={14} />
        </Button>
    {/if}
</Panel>

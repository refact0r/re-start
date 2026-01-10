<script lang="ts">
    import WeatherAPI from '../weather-api'
    import { settings } from '../settings-store.svelte'
    import { Panel, Text, Row, Column, Button } from './ui'
    import { RefreshCw } from 'lucide-svelte'

    const api = new WeatherAPI()

    let weather = $state(api.getWeather(settings.timeFormat))
    let syncing = $state(false)
    let current = $derived(weather?.current)
    let forecast = $derived(weather?.forecast ?? [])

    $effect(() => {
        void [settings.latitude, settings.longitude, settings.locationMode, 
              settings.tempUnit, settings.speedUnit, settings.timeFormat]

        if (api.isCacheStale(settings.latitude ?? 0, settings.longitude ?? 0)) {
            syncWeather()
        }
    })

    async function getCoordinates(): Promise<{ latitude: number; longitude: number }> {
        if (settings.locationMode === 'auto') {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 60000,
                })
            )
            return {
                latitude: Math.round(pos.coords.latitude * 100) / 100,
                longitude: Math.round(pos.coords.longitude * 100) / 100,
            }
        }
        return { latitude: settings.latitude!, longitude: settings.longitude! }
    }

    async function syncWeather(): Promise<void> {
        if (syncing) return
        syncing = true

        try {
            const { latitude, longitude } = await getCoordinates()
            await api.sync(latitude, longitude, settings.tempUnit, settings.speedUnit)
            weather = api.getWeather(settings.timeFormat)
        } catch (err) {
            console.error('Failed to sync weather:', err)
        } finally {
            syncing = false
        }
    }
</script>

<svelte:document onvisibilitychange={syncWeather} />

<Panel label={syncing ? 'syncing...' : 'weather'} clickableLabel onLabelClick={syncWeather} flexShrink={0} noFade>
    {#if settings.locationMode === 'manual' && (settings.latitude === null || settings.longitude === null)}
        <Text color="error">location not configured</Text>
    {:else if current}
        <Text as="div" size="2xl" color="primary" weight="light">{current.temperature_2m}°</Text>
        <Text as="div" size="lg" color="muted">{current.description}</Text>
        <br />
        <Row gap="lg">
            <Column>
                <Text>humi <Text color="primary">{current.relative_humidity_2m}%</Text></Text>
                <Text>prec <Text color="primary">{current.precipitation_probability}%</Text></Text>
            </Column>
            <Column>
                <Text>wind <Text color="primary">{current.wind_speed_10m} {settings.speedUnit}</Text></Text>
                <Text>feel <Text color="primary">{current.apparent_temperature}°</Text></Text>
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
        <Button variant="sync" onclick={syncWeather} disabled={syncing} spinning={syncing} title="sync">
            <RefreshCw size={14} />
        </Button>
    {/if}
</Panel>

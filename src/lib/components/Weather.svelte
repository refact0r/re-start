<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import WeatherAPI from '../weather-api.js'
    import { settings } from '../settings-store.svelte.js'
    import { RefreshCw } from 'lucide-svelte'

    let current = $state(null)
    let forecast = $state([])
    let syncing = $state(true)
    let error = $state(null)
    let initialLoad = $state(true)
    let syncInProgress = false

    const api = new WeatherAPI()

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            loadWeather()
        }
    }

    $effect(() => {
        const lat = settings.latitude
        const lon = settings.longitude
        const locationMode = settings.locationMode
        const tempUnit = settings.tempUnit
        const speedUnit = settings.speedUnit
        const timeFormat = settings.timeFormat

        if (untrack(() => initialLoad)) {
            initialLoad = false
            return
        }

        api.invalidateCache()
        loadWeather(true)
    })

    async function getCurrentLocation() {
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
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 60000,
                }
            )
        })
    }

    async function getCoordinates() {
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

        return {
            latitude: settings.latitude,
            longitude: settings.longitude,
        }
    }

    export async function loadWeather(showSyncing = false) {
        if (syncInProgress) return
        syncInProgress = true

        try {
            if (showSyncing) syncing = true
            error = null

            const { latitude, longitude } = await getCoordinates()

            // Load cached data immediately
            const cachedData = api.getWeather(settings.timeFormat)
            if (cachedData) {
                current = cachedData.current
                forecast = cachedData.forecast
                syncing = false
            }

            // Sync if cache is stale or empty
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
            error = err.message
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

<div class="panel-wrapper">
    <button class="widget-label" onclick={() => loadWeather(true)} disabled={syncing}>
        {syncing ? 'syncing...' : 'weather'}
    </button>

    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else if current}
            <div class="temp">{current.temperature_2m}°</div>
            <div class="description">{current.description}</div>
            <br />
            <div class="stats">
                <div class="col">
                    <div>
                        humi <span class="bright"
                            >{current.relative_humidity_2m}%</span
                        >
                    </div>
                    <div>
                        prec <span class="bright"
                            >{current.precipitation_probability}%</span
                        >
                    </div>
                </div>
                <div class="col">
                    <div>
                        wind <span class="bright"
                            >{current.wind_speed_10m} {settings.speedUnit}</span
                        >
                    </div>
                    <div>
                        feel <span class="bright"
                            >{current.apparent_temperature}°</span
                        >
                    </div>
                </div>
            </div>
            <br />
            <div class="forecast">
                <div class="col">
                    {#each forecast as forecast}
                        <div class="forecast-time">
                            {forecast.formattedTime}
                        </div>
                    {/each}
                </div>
                <div class="col">
                    {#each forecast as forecast}
                        <div class="forecast-temp">{forecast.temperature}°</div>
                    {/each}
                </div>
                <div class="col">
                    {#each forecast as forecast}
                        <div class="forecast-weather">
                            {forecast.description}
                        </div>
                    {/each}
                </div>
            </div>
            <button
                class="sync-btn"
                onclick={() => loadWeather(true)}
                disabled={syncing}
                title="sync"
            >
                <RefreshCw size={14} class={syncing ? 'spinning' : ''} />
            </button>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
    }
    .temp {
        font-size: 2rem;
        font-weight: 300;
        color: var(--txt-1);
        line-height: 2.625rem;
    }
    .description {
        font-size: 1.25rem;
        color: var(--txt-3);
    }
    .stats {
        display: flex;
        gap: 1.5rem;
    }
    .forecast {
        display: flex;
        gap: 1.5rem;
    }
    .forecast-time {
        text-align: end;
    }
    .forecast-temp {
        text-align: end;
        color: var(--txt-1);
    }
    .forecast-weather {
        color: var(--txt-3);
    }
</style>

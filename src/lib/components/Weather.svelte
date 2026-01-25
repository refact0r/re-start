<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import WeatherAPI from '../api/weather-api.js'
    import { settings } from '../stores/settings-store.svelte.js'

    let { class: className = '' } = $props()

    let current = $state(null)
    let forecast = $state([])
    let loading = $state(false)
    let error = $state(null)
    let offline = $state(false)
    let initialLoad = $state(true)
    let prevForecastMode = $state(settings.forecastMode)

    const weatherAPI = new WeatherAPI()

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
        const forecastMode = settings.forecastMode

        if (untrack(() => initialLoad)) {
            initialLoad = false
            prevForecastMode = forecastMode
            return
        }

        // Clear cache if forecast mode changed
        if (untrack(() => prevForecastMode) !== forecastMode) {
            prevForecastMode = forecastMode
            weatherAPI.clearCache()
        }

        refreshWeather()
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

    export async function loadWeather() {
        loading = true
        let lat = settings.latitude
        let lon = settings.longitude

        if (settings.locationMode === 'auto') {
            try {
                const location = await getCurrentLocation()
                lat = location.latitude
                lon = location.longitude
            } catch (err) {
                console.error('failed to get location:', err)
                error = 'failed to get location'
                loading = false
                return
            }
        }

        if (lat === null || lon === null) {
            error = 'location not configured'
            loading = false
            return
        }

        const cached = weatherAPI.getCachedWeather(
            settings.timeFormat,
            lat,
            lon,
            settings.forecastMode
        )
        if (cached.data) {
            current = cached.data.current
            forecast = cached.data.forecast

            if (!cached.isStale) {
                error = null
                loading = false
                return
            }
        }

        try {
            error = null

            const data = await weatherAPI.getWeather(
                lat,
                lon,
                settings.tempUnit,
                settings.speedUnit,
                settings.timeFormat,
                settings.forecastMode
            )

            current = data.current
            forecast = data.forecast
            offline = data.offline || false
        } catch (err) {
            if (!navigator.onLine) {
                error = 'offline'
            } else {
                error = 'failed to load weather'
            }
            console.error('weather load failed:', err)
        } finally {
            loading = false
        }
    }

    export function refreshWeather() {
        weatherAPI.clearCache()
        loadWeather()
    }

    onMount(() => {
        loadWeather()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="panel-wrapper {className}">
    <button class="widget-label" onclick={refreshWeather} disabled={loading}>
        {loading ? 'loading...' : offline ? 'weather (cached)' : 'weather'}
    </button>

    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else if current}
            <div class="temp">{current.icon} {current.temperature_2m}°{settings.tempUnit[0].toUpperCase()}</div>
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
                        rain <span class="bright"
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
                            >{current.apparent_temperature}°{settings.tempUnit[0].toUpperCase()}</span
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
                        {#if settings.forecastMode === 'daily'}
                            <div class="forecast-temp">
                                {forecast.temperatureMax}° <span class="separator">/</span> {forecast.temperatureMin}°{settings.tempUnit[0].toUpperCase()}
                            </div>
                        {:else}
                            <div class="forecast-temp">{forecast.temperature}°{settings.tempUnit[0].toUpperCase()}</div>
                        {/if}
                    {/each}
                </div>
                <div class="col">
                    {#each forecast as forecast}
                        <div class="forecast-weather">
                            {forecast.icon}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
    }
    .panel-wrapper.expand {
        flex-grow: 1;
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
    .forecast-temp .separator {
        color: var(--txt-3);
    }
    .forecast-weather {
        color: var(--txt-3);
    }
</style>

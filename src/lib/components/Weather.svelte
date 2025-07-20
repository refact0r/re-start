<script>
    import { onMount, untrack } from 'svelte'
    import WeatherAPI from '../weather-api.js'
    import { settings } from '../settings-store.svelte.js'

    let current = $state(null)
    let forecast = $state([])
    let loading = $state(true)
    let error = $state(null)
    let initialLoad = $state(true)

    const weatherAPI = new WeatherAPI()

    $effect(() => {
        const lat = settings.latitude
        const lon = settings.longitude
        const tempUnit = settings.tempUnit
        const speedUnit = settings.speedUnit
        const timeFormat = settings.timeFormat

        if (untrack(() => initialLoad)) {
            initialLoad = false
            return
        }

        refreshWeather()
    })

    export async function loadWeather() {
        if (settings.latitude === null || settings.longitude === null) {
            error = 'no latitude or longitude'
            loading = false
            return
        }

        try {
            loading = true
            error = ''

            const data = await weatherAPI.getWeather(
                settings.latitude,
                settings.longitude,
                settings.tempUnit,
                settings.speedUnit,
                settings.timeFormat
            )
            current = data.current
            forecast = data.forecast
        } catch (err) {
            error = 'failed to load weather'
            console.error(err)
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
    })
</script>

<div class="weather">
    {#if loading}
        <div>loading...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if current}
        <div class="temp">{current.temperature_2m}°</div>
        <div class="description">{current.description}</div>
        <br />
        <div class="stats">
            <div class="col">
                <div>
                    humi <span class="value"
                        >{current.relative_humidity_2m}%</span
                    >
                </div>
                <div>
                    prec <span class="value"
                        >{current.precipitation_probability}%</span
                    >
                </div>
            </div>
            <div class="col">
                <div>
                    wind <span class="value"
                        >{current.wind_speed_10m} {settings.speedUnit}</span
                    >
                </div>
                <div>
                    feel <span class="value"
                        >{current.apparent_temperature}°</span
                    >
                </div>
            </div>
        </div>
        <br />
        <div class="forecast">
            <div class="col">
                {#each forecast as forecast}
                    <div class="forecast-time">{forecast.formattedTime}</div>
                {/each}
            </div>
            <div class="col">
                {#each forecast as forecast}
                    <div class="forecast-temp">{forecast.temperature}°</div>
                {/each}
            </div>
            <div class="col">
                {#each forecast as forecast}
                    <div class="forecast-weather">{forecast.description}</div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .weather {
        height: 18rem;
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
    .value {
        color: var(--txt-1);
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

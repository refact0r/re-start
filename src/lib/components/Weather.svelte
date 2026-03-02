<script>
    import { onMount, onDestroy, untrack } from 'svelte'
    import WeatherAPI from '../api/weather-api.js'
    import WeatherIcon from './WeatherIcon.svelte'
    import { settings } from '../stores/settings-store.svelte.js'

    let { class: className = '' } = $props()

    let current = $state(null)
    let forecast = $state([])
    let loading = $state(false)
    let error = $state(null)
    let initialLoad = $state(true)
    let prevForecastMode = $state(settings.forecastMode)
    let radarTimeline = $state([])
    let radarLoading = $state(false)
    let radarError = $state('')
    let radarPeakProbability = $state(0)
    let radarTotalPrecipitation = $state('0.0')
    let radarNextRainLabel = $state('none')

    const weatherAPI = new WeatherAPI()
    const radarApiUrl = 'https://api.open-meteo.com/v1/forecast'
    const radarCacheKey = 'weather_radar_data'
    const radarCacheExpiry = 5 * 60 * 1000
    const radarSlotCount = 24 // 6 hours at 15-minute resolution
    const thunderCodes = new Set([95, 96, 99])
    const snowHeavyCodes = new Set([75, 77])
    const snowCodes = new Set([71, 73, 75, 77, 85, 86])
    const rainHeavyCodes = new Set([65, 67, 82])
    const rainCodes = new Set([
        51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
    ])
    const fogCodes = new Set([45, 48])
    const mostlyClearCodes = new Set([0, 1])
    const cloudCodes = new Set([2, 3])

    function getWeatherIconName(weatherCode, isDay = true, windSpeed = 0) {
        const code = Number(weatherCode)
        const wind = Number(windSpeed) || 0

        if (thunderCodes.has(code)) return 'cloud-lightning'
        if (snowHeavyCodes.has(code)) return 'snowflake'
        if (snowCodes.has(code)) return 'cloud-snow'
        if (rainHeavyCodes.has(code) || (rainCodes.has(code) && wind >= 18)) {
            return 'cloud-rain-wind'
        }
        if (rainCodes.has(code)) return 'cloud-rain'
        if (fogCodes.has(code) || wind >= 28) return 'wind'
        if (mostlyClearCodes.has(code)) return isDay ? 'sun' : 'sunset'
        if (cloudCodes.has(code)) return 'cloud-sun'

        return 'cloud-sun'
    }

    function getCurrentIconName() {
        if (!current) return 'cloud-sun'
        return getWeatherIconName(
            current.weather_code,
            current.is_day === 1,
            current.wind_speed_10m
        )
    }

    function getForecastIconName(forecastItem) {
        return getWeatherIconName(
            forecastItem.weatherCode,
            forecastItem.isDay !== false,
            0
        )
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            loadWeather()
        }
    }

    function formatRadarTime(timeString) {
        const date = new Date(timeString)
        if (settings.timeFormat === '12hr') {
            return date
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })
                .toLowerCase()
        }

        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })
    }

    function coordinatesChanged(oldLat, oldLon, newLat, newLon) {
        const threshold = 0.1
        return (
            Math.abs(oldLat - newLat) > threshold ||
            Math.abs(oldLon - newLon) > threshold
        )
    }

    function clearRadarCache() {
        localStorage.removeItem(radarCacheKey)
    }

    function getCachedRadar(latitude = null, longitude = null) {
        try {
            const cached = localStorage.getItem(radarCacheKey)
            if (!cached) return { data: null, isStale: false }

            const {
                data,
                timestamp,
                latitude: cachedLat,
                longitude: cachedLon,
            } = JSON.parse(cached)

            if (
                latitude != null &&
                longitude != null &&
                cachedLat != null &&
                cachedLon != null &&
                coordinatesChanged(cachedLat, cachedLon, latitude, longitude)
            ) {
                clearRadarCache()
                return { data: null, isStale: false }
            }

            const isStale = Date.now() - timestamp >= radarCacheExpiry
            return { data, isStale }
        } catch (cacheError) {
            console.error('failed to read weather radar cache:', cacheError)
            clearRadarCache()
            return { data: null, isStale: false }
        }
    }

    function cacheRadar(data, latitude, longitude) {
        localStorage.setItem(
            radarCacheKey,
            JSON.stringify({
                data,
                timestamp: Date.now(),
                latitude,
                longitude,
            })
        )
    }

    function updateRadarSummary(points) {
        if (points.length === 0) {
            radarPeakProbability = 0
            radarTotalPrecipitation = '0.0'
            radarNextRainLabel = 'none'
            return
        }

        radarPeakProbability = points.reduce(
            (max, point) => Math.max(max, point.probability),
            0
        )

        radarTotalPrecipitation = points
            .reduce((sum, point) => sum + point.precipitation, 0)
            .toFixed(1)

        const nextRainPoint = points.find(
            (point) => point.precipitation >= 0.1 || point.probability >= 35
        )
        radarNextRainLabel = nextRainPoint ? nextRainPoint.label : 'none'
    }

    function processRadarData(minutely) {
        if (!minutely || !Array.isArray(minutely.time)) {
            return []
        }

        const points = []
        const count = Math.min(radarSlotCount, minutely.time.length)

        for (let i = 0; i < count; i++) {
            const precipitation = Number(minutely.precipitation?.[i] ?? 0)
            const probability = Number(
                minutely.precipitation_probability?.[i] ?? 0
            )
            const intensityScore = precipitation * 20 + probability / 9

            points.push({
                label: formatRadarTime(minutely.time[i]),
                precipitation,
                probability,
                intensityScore,
            })
        }

        const peakIntensity = points.reduce(
            (max, point) => Math.max(max, point.intensityScore),
            0
        )

        return points.map((point) => {
            if (peakIntensity <= 0) {
                return {
                    ...point,
                    height: 8,
                    opacity: 0.22,
                }
            }

            const normalized = point.intensityScore / peakIntensity
            return {
                ...point,
                height: Math.max(8, Math.round(normalized * 100)),
                opacity: (0.24 + normalized * 0.7).toFixed(2),
            }
        })
    }

    async function fetchRadar(latitude, longitude) {
        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            timezone: 'auto',
            minutely_15: 'precipitation,precipitation_probability',
            forecast_minutely_15: radarSlotCount.toString(),
        })

        const response = await fetch(`${radarApiUrl}?${params}`)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    function updateFromRawRadar(rawData) {
        radarTimeline = processRadarData(rawData.minutely_15)
        updateRadarSummary(radarTimeline)
    }

    async function loadRadar(latitude, longitude) {
        radarLoading = true

        const cached = getCachedRadar(latitude, longitude)
        if (cached.data) {
            updateFromRawRadar(cached.data)
            radarError = ''
            if (!cached.isStale) {
                radarLoading = false
                return
            }
        }

        try {
            const rawData = await fetchRadar(latitude, longitude)
            cacheRadar(rawData, latitude, longitude)
            updateFromRawRadar(rawData)
            radarError = ''
        } catch (fetchError) {
            if (!cached.data) {
                radarError = 'failed to load radar'
            }
            console.error('weather radar load failed:', fetchError)
        } finally {
            radarLoading = false
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
            void loadRadar(lat, lon)

            if (!cached.isStale) {
                error = null
                loading = false
                return
            }
        } else {
            void loadRadar(lat, lon)
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
        } catch (err) {
            error = 'failed to load weather'
            console.error('weather load failed:', err)
        } finally {
            loading = false
        }
    }

    export function refreshWeather() {
        weatherAPI.clearCache()
        clearRadarCache()
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
        {loading ? 'loading...' : 'weather'}
    </button>

    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else if current}
            <div class="current-overview">
                <WeatherIcon
                    name={getCurrentIconName()}
                    size={42}
                    class="current-icon"
                />
                <div class="current-text">
                    <div class="temp">{current.temperature_2m}&deg;</div>
                    <div class="description">{current.description}</div>
                </div>
            </div>
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
                            >{current.apparent_temperature}&deg;</span
                        >
                    </div>
                </div>
            </div>
            <br />
            <div class="forecast">
                <div class="col">
                    {#each forecast as forecastItem}
                        <div class="forecast-time">
                            {forecastItem.formattedTime}
                        </div>
                    {/each}
                </div>
                <div class="col">
                    {#each forecast as forecastItem}
                        {#if settings.forecastMode === 'daily'}
                            <div class="forecast-temp">
                                {forecastItem.temperatureMax}&deg;
                                <span class="separator">/</span>
                                {forecastItem.temperatureMin}&deg;
                            </div>
                        {:else}
                            <div class="forecast-temp">
                                {forecastItem.temperature}&deg;
                            </div>
                        {/if}
                    {/each}
                </div>
                <div class="col">
                    {#each forecast as forecastItem}
                        <div class="forecast-weather">
                            <WeatherIcon
                                name={getForecastIconName(forecastItem)}
                                size={15}
                                class="forecast-icon"
                            />
                            <span>{forecastItem.description}</span>
                        </div>
                    {/each}
                </div>
            </div>
            <br />
            <div class="radar-section">
                {#if radarError}
                    <div class="dark">{radarError}</div>
                {:else if radarLoading && radarTimeline.length === 0}
                    <div class="dark">loading radar...</div>
                {:else if radarTimeline.length === 0}
                    <div class="dark">no radar data</div>
                {:else}
                    <div>
                        rain peak <span class="bright"
                            >{radarPeakProbability}%</span
                        >
                    </div>
                    <div>
                        next <span class="bright">{radarNextRainLabel}</span>
                    </div>
                    <div>
                        total <span class="bright"
                            >{radarTotalPrecipitation} mm</span
                        >
                    </div>
                    <br />
                    <div class="radar-chart">
                        {#each radarTimeline as slot}
                            <div
                                class="slot"
                                title={`${slot.label} ${slot.probability}% ${slot.precipitation.toFixed(1)} mm`}
                            >
                                <div
                                    class="bar"
                                    style={`height: ${slot.height}%; opacity: ${slot.opacity};`}
                                ></div>
                            </div>
                        {/each}
                    </div>
                    <div class="axis">
                        <span>now</span>
                        <span>+2h</span>
                        <span>+4h</span>
                        <span>+6h</span>
                    </div>
                {/if}
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
    .current-overview {
        display: flex;
        gap: 0.875rem;
        align-items: center;
    }
    .current-icon {
        color: var(--txt-1);
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
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--txt-3);
    }
    .forecast-icon {
        color: var(--txt-2);
        flex-shrink: 0;
    }
    .radar-section {
        min-height: 8.5rem;
    }
    .radar-chart {
        display: grid;
        grid-template-columns: repeat(24, minmax(0, 1fr));
        gap: 0.25rem;
        height: 5rem;
        align-items: end;
    }
    .slot {
        position: relative;
        height: 100%;
        border: 1px solid var(--bg-3);
        background: var(--bg-2);
        overflow: hidden;
    }
    .bar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to top, var(--txt-2), var(--txt-4));
        transition:
            height 240ms ease-out,
            opacity 240ms ease-out;
    }
    .axis {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        margin-top: 0.375rem;
        color: var(--txt-3);
        font-size: 0.875rem;
    }
    .axis span:nth-child(2),
    .axis span:nth-child(3) {
        text-align: center;
    }
    .axis span:last-child {
        text-align: end;
    }
</style>

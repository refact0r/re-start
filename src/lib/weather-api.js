import descriptions from '../assets/descriptions.json'

/**
 * OpenMeteo Weather API client with data processing utilities
 */
class WeatherAPI {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast'
        this.cacheKey = `weather_data`
        this.cacheExpiry = 15 * 60 * 1000
    }

    /**
     * Get weather data from API and cache it
     */
    async getWeather(
        latitude,
        longitude,
        tempUnit,
        speedUnit,
        timeFormat = '12hr'
    ) {
        const rawData = await this._fetchWeatherData(
            latitude,
            longitude,
            tempUnit,
            speedUnit
        )
        this._cacheWeather(rawData, latitude, longitude)

        return {
            current: this._processCurrentWeather(rawData.current),
            forecast: this._processHourlyForecast(
                rawData.hourly,
                rawData.current.time,
                timeFormat
            ),
        }
    }

    /**
     * Get cached weather data with staleness info
     */
    getCachedWeather(timeFormat = '12hr', latitude = null, longitude = null) {
        const cached = this._getCachedData(latitude, longitude)

        if (!cached.data) {
            return { data: null, isStale: false }
        }

        const processedData = {
            current: this._processCurrentWeather(cached.data.current),
            forecast: this._processHourlyForecast(
                cached.data.hourly,
                cached.data.current.time,
                timeFormat
            ),
        }

        return {
            data: processedData,
            isStale: cached.isStale,
        }
    }

    /**
     * Get cached data with expiration status
     */
    _getCachedData(latitude = null, longitude = null) {
        try {
            const cached = localStorage.getItem(this.cacheKey)
            if (!cached) return { data: null, isStale: false }

            const {
                data,
                timestamp,
                latitude: cachedLat,
                longitude: cachedLon,
            } = JSON.parse(cached)

            // Check if coordinates have changed significantly
            if (
                latitude != null &&
                longitude != null &&
                cachedLat != null &&
                cachedLon != null &&
                this._coordinatesChanged(
                    cachedLat,
                    cachedLon,
                    latitude,
                    longitude
                )
            ) {
                this.clearCache()
                return { data: null, isStale: false }
            }

            const isStale = Date.now() - timestamp >= this.cacheExpiry
            return { data, isStale }
        } catch (error) {
            console.error('failed to get cached weather data:', error)
            localStorage.removeItem(this.cacheKey)
            return { data: null, isStale: false }
        }
    }

    /**
     * Clear the weather cache
     */
    clearCache() {
        localStorage.removeItem(this.cacheKey)
    }

    /**
     * Check if coordinates have changed significantly (more than ~0.5 degrees / ~30 miles)
     */
    _coordinatesChanged(oldLat, oldLon, newLat, newLon) {
        const threshold = 0.1
        return (
            Math.abs(oldLat - newLat) > threshold ||
            Math.abs(oldLon - newLon) > threshold
        )
    }

    /**
     * Private method to fetch raw weather data from API
     */
    async _fetchWeatherData(latitude, longitude, tempUnit, speedUnit) {
        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            hourly: 'temperature_2m,weather_code,is_day',
            current:
                'temperature_2m,weather_code,relative_humidity_2m,precipitation_probability,wind_speed_10m,apparent_temperature,is_day',
            timezone: 'auto',
            forecast_hours: '24',
            temperature_unit: tempUnit,
            wind_speed_unit: speedUnit,
        })

        const response = await fetch(`${this.baseUrl}?${params}`)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        return data
    }

    /**
     * Process current weather data with descriptions
     */
    _processCurrentWeather(currentData) {
        return {
            ...currentData,
            temperature_2m: currentData.temperature_2m.toFixed(0),
            wind_speed_10m: currentData.wind_speed_10m.toFixed(0),
            apparent_temperature: currentData.apparent_temperature.toFixed(0),
            description: this._getWeatherDescription(
                currentData.weather_code,
                currentData.is_day === 1
            ),
        }
    }

    /**
     * Process hourly forecast to get every 3rd hour starting 3 hours from current hour
     */
    _processHourlyForecast(hourlyData, currentTime, timeFormat = '12hr') {
        const forecasts = []

        // Find the current or next hour in the forecast
        let currentIndex = 0
        for (let i = 0; i < hourlyData.time.length; i++) {
            const forecastTime = new Date(hourlyData.time[i])
            const now = new Date(currentTime)
            if (forecastTime >= now) {
                currentIndex = i
                break
            }
        }

        // Get forecasts every 3 hours starting from 3 hours after current, up to 5 forecasts
        for (
            let i = 0;
            i < 5 && currentIndex + (i + 1) * 3 < hourlyData.time.length;
            i++
        ) {
            const index = currentIndex + (i + 1) * 3
            forecasts.push({
                time: hourlyData.time[index],
                temperature: hourlyData.temperature_2m[index].toFixed(0),
                weatherCode: hourlyData.weather_code[index],
                description: this._getWeatherDescription(
                    hourlyData.weather_code[index],
                    hourlyData.is_day[index] === 1
                ),
                formattedTime: this._formatTime(
                    hourlyData.time[index],
                    timeFormat
                ),
            })
        }

        return forecasts
    }

    /**
     * Get weather description from code
     */
    _getWeatherDescription(weatherCode, isDay = true) {
        const timeOfDay = isDay ? 'day' : 'night'
        return (
            descriptions[weatherCode]?.[
                timeOfDay
            ]?.description?.toLowerCase() || 'unknown'
        )
    }

    /**
     * Format time to display (e.g., "12pm" for 12hr, "12:00" for 24hr)
     */
    _formatTime(timeString, timeFormat = '12hr') {
        const date = new Date(timeString)

        if (timeFormat === '12hr') {
            return date
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true,
                })
                .toLowerCase()
        } else {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: false,
            })
        }
    }

    /**
     * Cache weather data with timestamp and coordinates
     */
    _cacheWeather(data, latitude, longitude) {
        const cacheData = {
            data,
            timestamp: Date.now(),
            latitude,
            longitude,
        }
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData))
    }
}

export default WeatherAPI

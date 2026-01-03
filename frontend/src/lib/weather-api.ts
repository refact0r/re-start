import descriptions from '../assets/descriptions.json'
import type {
    TimeFormat,
    TempUnit,
    SpeedUnit,
    WeatherApiResponse,
    WeatherCacheData,
    WeatherData,
    ProcessedCurrentWeather,
    ForecastItem,
    CurrentWeatherRaw,
    HourlyWeatherRaw,
} from './types'
import { createLogger } from './logger'
import { NetworkError, SyncError } from './errors'

interface WeatherDescription {
    day?: { description?: string }
    night?: { description?: string }
}

const weatherDescriptions = descriptions as Record<string, WeatherDescription>

// Logger instance for Weather operations
const logger = createLogger('Weather')

/**
 * OpenMeteo Weather API client with caching
 * Follows same pattern as task/calendar backends
 */
class WeatherAPI {
    private baseUrl: string
    private dataKey: string
    private cacheExpiry: number
    private data: WeatherCacheData

    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast'
        this.dataKey = 'weather_data'
        this.cacheExpiry = 15 * 60 * 1000 // 15 minutes

        this.data = this._loadFromStorage()
    }

    /**
     * Load cached data from localStorage
     */
    private _loadFromStorage(): WeatherCacheData {
        try {
            const stored = localStorage.getItem(this.dataKey)
            return stored ? (JSON.parse(stored) as WeatherCacheData) : {}
        } catch (error) {
            logger.warn('Failed to load weather cache:', error)
            return {}
        }
    }

    /**
     * Save data to localStorage
     */
    private _saveToStorage(): void {
        localStorage.setItem(this.dataKey, JSON.stringify(this.data))
    }

    /**
     * Check if cache is stale (older than expiry time)
     */
    isCacheStale(
        latitude: number | null = null,
        longitude: number | null = null
    ): boolean {
        if (!this.data.timestamp) return true

        // Check if coordinates changed
        if (latitude != null && longitude != null) {
            if (
                this._coordinatesChanged(
                    this.data.latitude,
                    this.data.longitude,
                    latitude,
                    longitude
                )
            ) {
                return true
            }
        }

        return Date.now() - this.data.timestamp >= this.cacheExpiry
    }

    /**
     * Invalidate cache (force next sync to fetch fresh data)
     */
    invalidateCache(): void {
        this.data.timestamp = 0
        this._saveToStorage()
    }

    /**
     * Clear all cached data
     */
    clearLocalData(): void {
        localStorage.removeItem(this.dataKey)
        this.data = {}
    }

    /**
     * Get cached weather data (processed for display)
     */
    getWeather(timeFormat: TimeFormat = '12hr'): WeatherData | null {
        if (!this.data.raw) return null

        return {
            current: this._processCurrentWeather(this.data.raw.current),
            forecast: this._processHourlyForecast(
                this.data.raw.hourly,
                this.data.raw.current.time,
                timeFormat
            ),
        }
    }

    /**
     * Sync weather data from API
     */
    async sync(
        latitude: number,
        longitude: number,
        tempUnit: TempUnit,
        speedUnit: SpeedUnit
    ): Promise<WeatherCacheData> {
        try {
            logger.log('Syncing weather data:', {
                latitude,
                longitude,
                tempUnit,
                speedUnit,
            })

            const rawData = await this._fetchWeatherData(
                latitude,
                longitude,
                tempUnit,
                speedUnit
            )

            this.data = {
                raw: rawData,
                timestamp: Date.now(),
                latitude,
                longitude,
            }
            this._saveToStorage()

            logger.log('Weather sync successful')

            return this.data
        } catch (error) {
            // Re-throw NetworkError instances as-is
            if (error instanceof NetworkError) {
                throw error
            }

            // Wrap unknown errors
            logger.error('Weather sync failed:', error)
            throw SyncError.failed(
                'Weather sync failed',
                error instanceof Error ? error : undefined
            )
        }
    }

    /**
     * Check if coordinates have changed significantly (more than ~0.1 degrees)
     */
    private _coordinatesChanged(
        oldLat: number | undefined,
        oldLon: number | undefined,
        newLat: number,
        newLon: number
    ): boolean {
        if (oldLat == null || oldLon == null) return true
        const threshold = 0.1
        return (
            Math.abs(oldLat - newLat) > threshold ||
            Math.abs(oldLon - newLon) > threshold
        )
    }

    /**
     * Fetch raw weather data from API
     */
    private async _fetchWeatherData(
        latitude: number,
        longitude: number,
        tempUnit: TempUnit,
        speedUnit: SpeedUnit
    ): Promise<WeatherApiResponse> {
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

        try {
            const response = await fetch(`${this.baseUrl}?${params}`)
            if (!response.ok) {
                throw NetworkError.fromResponse(response)
            }
            return response.json() as Promise<WeatherApiResponse>
        } catch (error) {
            // Re-throw NetworkError instances as-is
            if (error instanceof NetworkError) {
                throw error
            }

            // Wrap unknown errors (e.g., network failures, JSON parse errors)
            logger.error('Failed to fetch weather data:', error)
            throw new NetworkError('Failed to fetch weather data', {
                originalError: error instanceof Error ? error : undefined,
            })
        }
    }

    /**
     * Process current weather data with descriptions
     */
    private _processCurrentWeather(
        currentData: CurrentWeatherRaw
    ): ProcessedCurrentWeather {
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
    private _processHourlyForecast(
        hourlyData: HourlyWeatherRaw,
        currentTime: string,
        timeFormat: TimeFormat = '12hr'
    ): ForecastItem[] {
        const forecasts: ForecastItem[] = []

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
            const time = hourlyData.time[index]
            const temp = hourlyData.temperature_2m[index]
            const code = hourlyData.weather_code[index]
            const isDay = hourlyData.is_day[index]

            if (
                time !== undefined &&
                temp !== undefined &&
                code !== undefined &&
                isDay !== undefined
            ) {
                forecasts.push({
                    time,
                    temperature: temp.toFixed(0),
                    weatherCode: code,
                    description: this._getWeatherDescription(code, isDay === 1),
                    formattedTime: this._formatTime(time, timeFormat),
                })
            }
        }

        return forecasts
    }

    /**
     * Get weather description from code
     */
    private _getWeatherDescription(weatherCode: number, isDay = true): string {
        const timeOfDay = isDay ? 'day' : 'night'
        const codeStr = String(weatherCode)
        return (
            weatherDescriptions[codeStr]?.[
                timeOfDay
            ]?.description?.toLowerCase() || 'unknown'
        )
    }

    /**
     * Format time to display (e.g., "12pm" for 12hr, "12:00" for 24hr)
     */
    private _formatTime(
        timeString: string,
        timeFormat: TimeFormat = '12hr'
    ): string {
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
}

export default WeatherAPI

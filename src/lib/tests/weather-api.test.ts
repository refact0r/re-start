import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WeatherAPI from '../weather-api'

// Helper to create a mock localStorage
function createMockLocalStorage() {
    const store: Record<string, string> = {}
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key]
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach((key) => delete store[key])
        }),
        get length() {
            return Object.keys(store).length
        },
        key: vi.fn((index: number) => {
            const keys = Object.keys(store)
            return keys[index] || null
        }),
        _store: store, // Internal access for testing
    }
}

// Helper to create a mock fetch function
function createMockFetch() {
    return vi.fn()
}

describe('WeatherAPI', () => {
    let mockLocalStorage: ReturnType<typeof createMockLocalStorage>
    let mockFetch: ReturnType<typeof createMockFetch>

    beforeEach(() => {
        mockLocalStorage = createMockLocalStorage()
        vi.stubGlobal('localStorage', mockLocalStorage)

        mockFetch = createMockFetch()
        vi.stubGlobal('fetch', mockFetch)

        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('constructor', () => {
        it('initializes with empty data when localStorage is empty', () => {
            const api = new WeatherAPI()

            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'weather_data'
            )

            const weather = api.getWeather()
            expect(weather).toBeNull()
        })

        it('loads existing data from localStorage', () => {
            const existingData = {
                raw: {
                    current: {
                        temperature_2m: 20.5,
                        weather_code: 0,
                        relative_humidity_2m: 60,
                        precipitation_probability: 10,
                        wind_speed_10m: 5.5,
                        apparent_temperature: 18.5,
                        is_day: 1,
                        time: '2025-12-07T12:00:00',
                    },
                    hourly: {
                        time: [
                            '2025-12-07T12:00:00',
                            '2025-12-07T13:00:00',
                            '2025-12-07T14:00:00',
                            '2025-12-07T15:00:00',
                            '2025-12-07T16:00:00',
                        ],
                        temperature_2m: [20, 21, 22, 21, 20],
                        weather_code: [0, 1, 2, 1, 0],
                        is_day: [1, 1, 1, 1, 1],
                    },
                },
                timestamp: Date.now(),
                latitude: 40.7128,
                longitude: -74.006,
            }

            mockLocalStorage._store['weather_data'] =
                JSON.stringify(existingData)

            const api = new WeatherAPI()

            const weather = api.getWeather()
            expect(weather).not.toBeNull()
            expect(weather?.current.temperature_2m).toBe('21')
        })

        it('handles corrupted localStorage data gracefully', () => {
            mockLocalStorage._store['weather_data'] = 'invalid-json{'

            const api = new WeatherAPI()

            expect(api.getWeather()).toBeNull()
        })
    })

    describe('sync', () => {
        it('makes API call with correct parameters', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20.5,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5.5,
                    apparent_temperature: 18.5,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    'https://api.open-meteo.com/v1/forecast'
                )
            )

            const call = mockFetch.mock.calls[0]
            const url = call[0] as string

            // Verify URL parameters (URL-encoded)
            expect(url).toContain('latitude=40.7128')
            expect(url).toContain('longitude=-74.006')
            expect(url).toContain('temperature_unit=celsius')
            expect(url).toContain('wind_speed_unit=kmh')
            expect(url).toContain('timezone=auto')
            expect(url).toContain('forecast_hours=24')
            expect(url).toContain('hourly=')
            expect(url).toContain('temperature_2m')
            expect(url).toContain('weather_code')
            expect(url).toContain('is_day')
            expect(url).toContain('current=')
            expect(url).toContain('relative_humidity_2m')
            expect(url).toContain('precipitation_probability')
            expect(url).toContain('wind_speed_10m')
            expect(url).toContain('apparent_temperature')
        })

        it('uses fahrenheit and mph when specified', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 68,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 3.5,
                    apparent_temperature: 65,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [68],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'fahrenheit', 'mph')

            const call = mockFetch.mock.calls[0]
            const url = call[0] as string

            expect(url).toContain('temperature_unit=fahrenheit')
            expect(url).toContain('wind_speed_unit=mph')
        })

        it('stores data in cache after successful sync', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20.5,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5.5,
                    apparent_temperature: 18.5,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'weather_data',
                expect.any(String)
            )

            const savedData = JSON.parse(
                mockLocalStorage._store['weather_data']
            )
            expect(savedData.raw).toEqual(mockResponse)
            expect(savedData.timestamp).toBeDefined()
            expect(savedData.latitude).toBe(40.7128)
            expect(savedData.longitude).toBe(-74.006)
        })

        it('throws error on failed API request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            })

            const api = new WeatherAPI()

            await expect(
                api.sync(40.7128, -74.006, 'celsius', 'kmh')
            ).rejects.toThrow('HTTP 500 Internal Server Error')
        })

        it('returns cache data after sync', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20.5,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5.5,
                    apparent_temperature: 18.5,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            const result = await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(result.raw).toEqual(mockResponse)
            expect(result.timestamp).toBeDefined()
            expect(result.latitude).toBe(40.7128)
            expect(result.longitude).toBe(-74.006)
        })
    })

    describe('isCacheStale', () => {
        it('returns true when no timestamp exists', () => {
            const api = new WeatherAPI()
            expect(api.isCacheStale()).toBe(true)
        })

        it('returns false when cache is fresh (within 15 minutes)', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(api.isCacheStale()).toBe(false)
        })

        it('returns true when cache is older than 15 minutes', () => {
            const oldTimestamp = Date.now() - 16 * 60 * 1000 // 16 minutes ago

            const existingData = {
                raw: {
                    current: {
                        temperature_2m: 20,
                        weather_code: 0,
                        relative_humidity_2m: 60,
                        precipitation_probability: 10,
                        wind_speed_10m: 5,
                        apparent_temperature: 18,
                        is_day: 1,
                        time: '2025-12-07T12:00:00',
                    },
                    hourly: {
                        time: ['2025-12-07T12:00:00'],
                        temperature_2m: [20],
                        weather_code: [0],
                        is_day: [1],
                    },
                },
                timestamp: oldTimestamp,
                latitude: 40.7128,
                longitude: -74.006,
            }

            mockLocalStorage._store['weather_data'] =
                JSON.stringify(existingData)

            const api = new WeatherAPI()

            expect(api.isCacheStale()).toBe(true)
        })

        it('returns true when coordinates change significantly', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            // New coordinates differ by more than 0.1 degrees
            expect(api.isCacheStale(41.0, -74.006)).toBe(true)
        })

        it('returns false when coordinates change insignificantly', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            // New coordinates differ by less than 0.1 degrees
            expect(api.isCacheStale(40.72, -74.01)).toBe(false)
        })

        it('returns true when coordinates are provided and cache has no coordinates', () => {
            const existingData = {
                raw: {
                    current: {
                        temperature_2m: 20,
                        weather_code: 0,
                        relative_humidity_2m: 60,
                        precipitation_probability: 10,
                        wind_speed_10m: 5,
                        apparent_temperature: 18,
                        is_day: 1,
                        time: '2025-12-07T12:00:00',
                    },
                    hourly: {
                        time: ['2025-12-07T12:00:00'],
                        temperature_2m: [20],
                        weather_code: [0],
                        is_day: [1],
                    },
                },
                timestamp: Date.now(),
            }

            mockLocalStorage._store['weather_data'] =
                JSON.stringify(existingData)

            const api = new WeatherAPI()

            expect(api.isCacheStale(40.7128, -74.006)).toBe(true)
        })
    })

    describe('getWeather', () => {
        it('returns null when no cached data exists', () => {
            const api = new WeatherAPI()
            expect(api.getWeather()).toBeNull()
        })

        it('returns processed weather data from cache', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20.5,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5.5,
                    apparent_temperature: 18.5,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: [
                        '2025-12-07T12:00:00',
                        '2025-12-07T13:00:00',
                        '2025-12-07T14:00:00',
                        '2025-12-07T15:00:00',
                        '2025-12-07T16:00:00',
                        '2025-12-07T17:00:00',
                        '2025-12-07T18:00:00',
                    ],
                    temperature_2m: [20, 21, 22, 21, 20, 19, 18],
                    weather_code: [0, 1, 2, 1, 0, 0, 0],
                    is_day: [1, 1, 1, 1, 1, 0, 0],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather).not.toBeNull()
            expect(weather?.current).toBeDefined()
            expect(weather?.forecast).toBeDefined()
        })

        it('processes current weather with correct formatting', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20.7,
                    weather_code: 0,
                    relative_humidity_2m: 65,
                    precipitation_probability: 15,
                    wind_speed_10m: 5.8,
                    apparent_temperature: 18.3,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.current.temperature_2m).toBe('21') // Rounded
            expect(weather?.current.wind_speed_10m).toBe('6') // Rounded
            expect(weather?.current.apparent_temperature).toBe('18') // Rounded
            expect(weather?.current.description).toBe('sunny') // Weather code 0, day
        })

        it('returns weather description for day time', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 61,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [61],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.current.description).toBe('light rain')
        })

        it('returns weather description for night time', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 15,
                    weather_code: 0,
                    relative_humidity_2m: 70,
                    precipitation_probability: 5,
                    wind_speed_10m: 3,
                    apparent_temperature: 13,
                    is_day: 0,
                    time: '2025-12-07T22:00:00',
                },
                hourly: {
                    time: ['2025-12-07T22:00:00'],
                    temperature_2m: [15],
                    weather_code: [0],
                    is_day: [0],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.current.description).toBe('clear')
        })

        it('returns unknown for invalid weather codes', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 9999,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [9999],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.current.description).toBe('unknown')
        })

        it('processes hourly forecast starting 3 hours from current', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: [
                        '2025-12-07T12:00:00',
                        '2025-12-07T13:00:00',
                        '2025-12-07T14:00:00',
                        '2025-12-07T15:00:00',
                        '2025-12-07T16:00:00',
                        '2025-12-07T17:00:00',
                        '2025-12-07T18:00:00',
                        '2025-12-07T19:00:00',
                        '2025-12-07T20:00:00',
                        '2025-12-07T21:00:00',
                        '2025-12-07T22:00:00',
                        '2025-12-07T23:00:00',
                        '2025-12-08T00:00:00',
                    ],
                    temperature_2m: [20, 21, 22, 23, 24, 23, 22, 21, 20, 19, 18, 17, 16],
                    weather_code: [0, 1, 2, 1, 0, 0, 0, 1, 2, 3, 45, 51, 61],
                    is_day: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            // Should get forecasts at 3, 6, 9, 12, 15 hours from current (indexes 3, 6, 9, 12)
            expect(weather?.forecast).toHaveLength(4)
            expect(weather?.forecast[0].time).toBe('2025-12-07T15:00:00')
            expect(weather?.forecast[1].time).toBe('2025-12-07T18:00:00')
            expect(weather?.forecast[2].time).toBe('2025-12-07T21:00:00')
            expect(weather?.forecast[3].time).toBe('2025-12-08T00:00:00')
        })

        it('limits forecast to 5 items maximum', async () => {
            const times = []
            const temps = []
            const codes = []
            const isDays = []

            // Create 24 hours of data
            for (let i = 0; i < 24; i++) {
                times.push(
                    `2025-12-07T${String(12 + i).padStart(2, '0')}:00:00`
                )
                temps.push(20 + i % 5)
                codes.push(0)
                isDays.push(i < 6 ? 1 : 0)
            }

            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: times,
                    temperature_2m: temps,
                    weather_code: codes,
                    is_day: isDays,
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.forecast.length).toBeLessThanOrEqual(5)
        })

        it('formats forecast times in 12hr format', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: [
                        '2025-12-07T12:00:00',
                        '2025-12-07T13:00:00',
                        '2025-12-07T14:00:00',
                        '2025-12-07T15:00:00',
                        '2025-12-07T16:00:00',
                        '2025-12-07T17:00:00',
                        '2025-12-07T18:00:00',
                    ],
                    temperature_2m: [20, 21, 22, 23, 22, 21, 20],
                    weather_code: [0, 1, 2, 1, 0, 0, 0],
                    is_day: [1, 1, 1, 1, 1, 1, 1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather('12hr')

            // Format is like "3pm" or "3 pm" depending on browser locale
            expect(weather?.forecast[0].formattedTime).toMatch(/^\d{1,2}\s?(am|pm)$/)
        })

        it('formats forecast times in 24hr format', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: [
                        '2025-12-07T12:00:00',
                        '2025-12-07T13:00:00',
                        '2025-12-07T14:00:00',
                        '2025-12-07T15:00:00',
                        '2025-12-07T16:00:00',
                        '2025-12-07T17:00:00',
                        '2025-12-07T18:00:00',
                    ],
                    temperature_2m: [20, 21, 22, 23, 22, 21, 20],
                    weather_code: [0, 1, 2, 1, 0, 0, 0],
                    is_day: [1, 1, 1, 1, 1, 1, 1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather('24hr')

            expect(weather?.forecast[0].formattedTime).toMatch(/^\d{1,2}:\d{2}$/)
        })

        it('rounds forecast temperatures to whole numbers', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: [
                        '2025-12-07T12:00:00',
                        '2025-12-07T13:00:00',
                        '2025-12-07T14:00:00',
                        '2025-12-07T15:00:00',
                        '2025-12-07T16:00:00',
                        '2025-12-07T17:00:00',
                        '2025-12-07T18:00:00',
                    ],
                    temperature_2m: [20.7, 21.3, 22.9, 23.1, 22.5, 21.4, 20.2],
                    weather_code: [0, 1, 2, 1, 0, 0, 0],
                    is_day: [1, 1, 1, 1, 1, 1, 1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            const weather = api.getWeather()

            expect(weather?.forecast[0].temperature).toBe('23')
            expect(weather?.forecast[1].temperature).toBe('20')
        })
    })

    describe('invalidateCache', () => {
        it('sets timestamp to 0', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(api.isCacheStale()).toBe(false)

            api.invalidateCache()

            expect(api.isCacheStale()).toBe(true)
        })

        it('saves invalidated cache to localStorage', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            api.invalidateCache()

            const savedData = JSON.parse(
                mockLocalStorage._store['weather_data']
            )
            expect(savedData.timestamp).toBe(0)
        })

        it('preserves raw weather data when invalidating', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            api.invalidateCache()

            const weather = api.getWeather()
            expect(weather).not.toBeNull()
            expect(weather?.current.temperature_2m).toBe('20')
        })
    })

    describe('clearLocalData', () => {
        it('removes weather data from localStorage', () => {
            mockLocalStorage._store['weather_data'] = JSON.stringify({
                raw: {
                    current: {
                        temperature_2m: 20,
                        weather_code: 0,
                        relative_humidity_2m: 60,
                        precipitation_probability: 10,
                        wind_speed_10m: 5,
                        apparent_temperature: 18,
                        is_day: 1,
                        time: '2025-12-07T12:00:00',
                    },
                    hourly: {
                        time: ['2025-12-07T12:00:00'],
                        temperature_2m: [20],
                        weather_code: [0],
                        is_day: [1],
                    },
                },
                timestamp: Date.now(),
            })

            const api = new WeatherAPI()
            api.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'weather_data'
            )
        })

        it('resets data to empty state', async () => {
            const mockResponse = {
                current: {
                    temperature_2m: 20,
                    weather_code: 0,
                    relative_humidity_2m: 60,
                    precipitation_probability: 10,
                    wind_speed_10m: 5,
                    apparent_temperature: 18,
                    is_day: 1,
                    time: '2025-12-07T12:00:00',
                },
                hourly: {
                    time: ['2025-12-07T12:00:00'],
                    temperature_2m: [20],
                    weather_code: [0],
                    is_day: [1],
                },
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const api = new WeatherAPI()
            await api.sync(40.7128, -74.006, 'celsius', 'kmh')

            expect(api.getWeather()).not.toBeNull()

            api.clearLocalData()

            expect(api.getWeather()).toBeNull()
        })
    })
})

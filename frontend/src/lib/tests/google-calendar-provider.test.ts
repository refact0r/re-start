import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GoogleCalendarProvider from '../providers/google-calendar-provider'
import * as googleAuth from '../providers/google-auth'
import * as uuid from '../uuid'

// Mock the google-auth module
vi.mock('../providers/google-auth', () => ({
    isSignedIn: vi.fn(() => true),
    migrateStorageKeys: vi.fn(),
    apiRequest: vi.fn(),
    createApiClient: vi.fn(() => vi.fn()),
}))

// Mock the uuid module
vi.mock('../uuid', () => ({
    generateUUID: vi.fn(() => 'mock-uuid-123'),
}))

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

describe('GoogleCalendarProvider', () => {
    let mockLocalStorage: ReturnType<typeof createMockLocalStorage>
    let mockApiRequest: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockLocalStorage = createMockLocalStorage()
        vi.stubGlobal('localStorage', mockLocalStorage)

        // Reset mock implementations
        mockApiRequest = vi.fn()
        // createApiClient returns a function that will be used for API requests
        vi.mocked(googleAuth.createApiClient).mockReturnValue(mockApiRequest)
        vi.mocked(googleAuth.isSignedIn).mockReturnValue(true)

        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('constructor', () => {
        it('initializes with empty data when localStorage is empty', () => {
            const backend = new GoogleCalendarProvider()

            expect(googleAuth.migrateStorageKeys).toHaveBeenCalled()
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'google_calendar_data'
            )

            const events = backend.getEvents()
            expect(events).toEqual([])
        })

        it('loads existing data from localStorage', () => {
            const existingData = {
                calendars: [{ id: 'cal1', summary: 'Work' }],
                events: [
                    {
                        id: 'event1',
                        summary: 'Meeting',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                        calendarId: 'cal1',
                        calendarName: 'Work',
                    },
                ],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(existingData)

            const backend = new GoogleCalendarProvider()

            const events = backend.getEvents()
            expect(events).toHaveLength(1)
            expect(events[0].title).toBe('Meeting')
        })

        it('handles corrupted JSON in localStorage', () => {
            mockLocalStorage._store['google_calendar_data'] = 'invalid-json'

            expect(() => new GoogleCalendarProvider()).toThrow()
        })
    })

    describe('isCacheStale', () => {
        it('returns true when no timestamp exists', () => {
            const backend = new GoogleCalendarProvider()
            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is fresh (within 5 minutes)', () => {
            const mockData = {
                calendars: [],
                events: [],
                timestamp: Date.now(),
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            expect(backend.isCacheStale()).toBe(false)
        })

        it('returns true when cache is older than 5 minutes', () => {
            const oldTimestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago

            const mockData = {
                calendars: [],
                events: [],
                timestamp: oldTimestamp,
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is at the 5-minute boundary', () => {
            const boundaryTimestamp = Date.now() - 5 * 60 * 1000 + 100 // Just under 5 minutes

            const mockData = {
                calendars: [],
                events: [],
                timestamp: boundaryTimestamp,
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            expect(backend.isCacheStale()).toBe(false)
        })
    })

    describe('getIsSignedIn', () => {
        it('delegates to google-auth module', () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(true)

            const backend = new GoogleCalendarProvider()
            const result = backend.getIsSignedIn()

            expect(googleAuth.isSignedIn).toHaveBeenCalled()
            expect(result).toBe(true)
        })

        it('returns false when not signed in', () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(false)

            const backend = new GoogleCalendarProvider()
            const result = backend.getIsSignedIn()

            expect(result).toBe(false)
        })
    })

    describe('sync', () => {
        it('throws error when not signed in', async () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(false)

            const backend = new GoogleCalendarProvider()

            await expect(backend.sync()).rejects.toThrow(
                'Not signed in to Google account'
            )
        })

        it('fetches calendar list and events', async () => {
            const mockCalendarsResponse = {
                items: [
                    { id: 'cal1', summary: 'Work', selected: true },
                    { id: 'cal2', summary: 'Personal', selected: true },
                ],
            }

            const now = new Date()
            const mockEventsResponse1 = {
                items: [
                    {
                        id: 'event1',
                        summary: 'Meeting 1',
                        start: { dateTime: now.toISOString() },
                        end: {
                            dateTime: new Date(
                                now.getTime() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            const mockEventsResponse2 = {
                items: [
                    {
                        id: 'event2',
                        summary: 'Meeting 2',
                        start: { dateTime: now.toISOString() },
                        end: {
                            dateTime: new Date(
                                now.getTime() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCalendarsResponse)
                .mockResolvedValueOnce(mockEventsResponse1)
                .mockResolvedValueOnce(mockEventsResponse2)

            const backend = new GoogleCalendarProvider()
            const result = await backend.sync()

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/users/me/calendarList?maxResults=50'
            )

            expect(result.calendars).toHaveLength(2)
            expect(result.events).toHaveLength(2)
        })

        it('filters out unselected calendars', async () => {
            const mockCalendarsResponse = {
                items: [
                    { id: 'cal1', summary: 'Work', selected: true },
                    { id: 'cal2', summary: 'Hidden', selected: false },
                ],
            }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const result = await backend.sync()

            expect(result.calendars).toHaveLength(1)
            expect(result.calendars![0].id).toBe('cal1')
        })

        it('enriches events with calendar info', async () => {
            const mockCalendarsResponse = {
                items: [
                    {
                        id: 'work-cal',
                        summary: 'Work Calendar',
                        backgroundColor: '#ff0000',
                        selected: true,
                    },
                ],
            }

            const now = new Date()
            const mockEventsResponse = {
                items: [
                    {
                        id: 'event1',
                        summary: 'Team Meeting',
                        start: { dateTime: now.toISOString() },
                        end: {
                            dateTime: new Date(
                                now.getTime() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCalendarsResponse)
                .mockResolvedValueOnce(mockEventsResponse)

            const backend = new GoogleCalendarProvider()
            await backend.sync()

            const events = backend.getEvents()
            expect(events).toHaveLength(1)
            expect(events[0].calendarName).toBe('Work Calendar')
            expect(events[0].calendarColor).toBe('#ff0000')
        })

        it('saves data to localStorage with timestamp', async () => {
            const mockCalendarsResponse = { items: [] }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'google_calendar_data',
                expect.any(String)
            )

            const savedData = JSON.parse(
                mockLocalStorage._store['google_calendar_data']
            )
            expect(savedData.timestamp).toBeDefined()
            expect(savedData.timestamp).toBeGreaterThan(0)
        })

        it('syncs only selected calendar IDs when specified', async () => {
            const mockCalendarsResponse = {
                items: [
                    { id: 'cal1', summary: 'Work', selected: true },
                    { id: 'cal2', summary: 'Personal', selected: true },
                    { id: 'cal3', summary: 'Other', selected: true },
                ],
            }

            const mockEventsResponse = { items: [] }

            mockApiRequest
                .mockResolvedValueOnce(mockCalendarsResponse)
                .mockResolvedValueOnce(mockEventsResponse)

            const backend = new GoogleCalendarProvider()
            await backend.sync(['cal1'])

            // Should only fetch events for cal1
            expect(mockApiRequest).toHaveBeenCalledTimes(2) // 1 calendar list + 1 events
            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/calendars/cal1/events')
            )
        })

        it('uses getTodayBounds for event time filtering', async () => {
            const mockCalendarsResponse = {
                items: [{ id: 'cal1', summary: 'Work', selected: true }],
            }

            const mockEventsResponse = { items: [] }

            mockApiRequest
                .mockResolvedValueOnce(mockCalendarsResponse)
                .mockResolvedValueOnce(mockEventsResponse)

            const backend = new GoogleCalendarProvider()
            await backend.sync()

            // Verify API call includes timeMin and timeMax parameters
            const eventsCall = mockApiRequest.mock.calls.find((call) =>
                call[0].includes('/events?')
            )
            expect(eventsCall).toBeDefined()
            expect(eventsCall![0]).toContain('timeMin=')
            expect(eventsCall![0]).toContain('timeMax=')
            expect(eventsCall![0]).toContain('singleEvents=true')
            expect(eventsCall![0]).toContain('orderBy=startTime')
        })

        it('handles empty calendar list', async () => {
            const mockCalendarsResponse = { items: [] }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const result = await backend.sync()

            expect(result.calendars).toEqual([])
            expect(result.events).toEqual([])
        })

        it('handles missing items in API responses', async () => {
            const mockCalendarsResponse = {}

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const result = await backend.sync()

            expect(result.calendars).toEqual([])
        })

        it('continues syncing when one calendar fails', async () => {
            const consoleWarnSpy = vi
                .spyOn(console, 'warn')
                .mockImplementation(() => {})

            const mockCalendarsResponse = {
                items: [
                    { id: 'cal1', summary: 'Work', selected: true },
                    { id: 'cal2', summary: 'Personal', selected: true },
                ],
            }

            const mockEventsResponse = { items: [] }

            mockApiRequest
                .mockResolvedValueOnce(mockCalendarsResponse)
                .mockRejectedValueOnce(new Error('Calendar fetch failed'))
                .mockResolvedValueOnce(mockEventsResponse)

            const backend = new GoogleCalendarProvider()
            const result = await backend.sync()

            // Should still return data from successful calendar
            expect(result.events).toEqual([])
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[GoogleCalendar]',
                'Failed to fetch events from calendar:',
                expect.objectContaining({
                    calendarId: 'cal1',
                    error: expect.any(Error),
                })
            )

            consoleWarnSpy.mockRestore()
        })

        it('throws error on calendar list API failure', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            mockApiRequest.mockRejectedValueOnce(new Error('API request failed'))

            const backend = new GoogleCalendarProvider()

            await expect(backend.sync()).rejects.toThrow('Google Calendar sync failed')
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[GoogleCalendar]',
                'Google Calendar sync failed:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe('getTodayBounds', () => {
        it('returns start and end of current day in ISO format', () => {
            // Use a specific date for testing
            const testDate = new Date('2025-12-25T15:30:00.000Z')
            vi.setSystemTime(testDate)

            const backend = new GoogleCalendarProvider()

            // Access private method via type assertion for testing
            const getTodayBounds = (backend as any).getTodayBounds.bind(backend)
            const { timeMin, timeMax } = getTodayBounds()

            const minDate = new Date(timeMin)
            const maxDate = new Date(timeMax)

            // timeMin should be start of day (00:00:00)
            expect(minDate.getHours()).toBe(0)
            expect(minDate.getMinutes()).toBe(0)
            expect(minDate.getSeconds()).toBe(0)
            expect(minDate.getMilliseconds()).toBe(0)

            // timeMax should be end of day (23:59:59.999)
            expect(maxDate.getHours()).toBe(23)
            expect(maxDate.getMinutes()).toBe(59)
            expect(maxDate.getSeconds()).toBe(59)
            expect(maxDate.getMilliseconds()).toBe(999)

            // Both should be on the same date
            expect(minDate.getDate()).toBe(maxDate.getDate())
            expect(minDate.getMonth()).toBe(maxDate.getMonth())
            expect(minDate.getFullYear()).toBe(maxDate.getFullYear())

            vi.useRealTimers()
        })
    })

    describe('getEvents', () => {
        it('returns empty array when no events exist', () => {
            const backend = new GoogleCalendarProvider()
            expect(backend.getEvents()).toEqual([])
        })

        it('filters out cancelled events', () => {
            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Active Event',
                        status: 'confirmed',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                    {
                        id: 'event2',
                        summary: 'Cancelled Event',
                        status: 'cancelled',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events).toHaveLength(1)
            expect(events[0].title).toBe('Active Event')
        })

        it('processes all-day events correctly', () => {
            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'All Day Event',
                        start: { date: '2025-12-25' },
                        end: { date: '2025-12-26' },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events).toHaveLength(1)
            expect(events[0].isAllDay).toBe(true)
            expect(events[0].startTime).toBeInstanceOf(Date)
            expect(events[0].endTime).toBeInstanceOf(Date)
        })

        it('processes timed events correctly', () => {
            const startTime = new Date()
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Timed Event',
                        start: { dateTime: startTime.toISOString() },
                        end: { dateTime: endTime.toISOString() },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events).toHaveLength(1)
            expect(events[0].isAllDay).toBe(false)
            expect(events[0].startTime.getTime()).toBe(startTime.getTime())
            expect(events[0].endTime.getTime()).toBe(endTime.getTime())
        })

        it('sets isPast flag correctly for past events', () => {
            const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Past Event',
                        start: { dateTime: pastStart.toISOString() },
                        end: { dateTime: pastEnd.toISOString() },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].isPast).toBe(true)
            expect(events[0].isOngoing).toBe(false)
        })

        it('sets isOngoing flag correctly for ongoing events', () => {
            const ongoingStart = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
            const ongoingEnd = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Ongoing Event',
                        start: { dateTime: ongoingStart.toISOString() },
                        end: { dateTime: ongoingEnd.toISOString() },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].isOngoing).toBe(true)
            expect(events[0].isPast).toBe(false)
        })

        it('sets isPast and isOngoing correctly for future events', () => {
            const futureStart = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now
            const futureEnd = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Future Event',
                        start: { dateTime: futureStart.toISOString() },
                        end: { dateTime: futureEnd.toISOString() },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].isPast).toBe(false)
            expect(events[0].isOngoing).toBe(false)
        })

        it('sorts all-day events before timed events', () => {
            const timedStart = new Date(Date.now() - 30 * 60 * 1000)
            const timedEnd = new Date(Date.now() + 30 * 60 * 1000)

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Timed Event',
                        start: { dateTime: timedStart.toISOString() },
                        end: { dateTime: timedEnd.toISOString() },
                    },
                    {
                        id: 'event2',
                        summary: 'All Day Event',
                        start: { date: '2025-12-25' },
                        end: { date: '2025-12-26' },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events).toHaveLength(2)
            expect(events[0].title).toBe('All Day Event')
            expect(events[1].title).toBe('Timed Event')
        })

        it('sorts timed events by start time', () => {
            const laterStart = new Date(Date.now() + 2 * 60 * 60 * 1000)
            const laterEnd = new Date(Date.now() + 3 * 60 * 60 * 1000)
            const earlierStart = new Date(Date.now() + 1 * 60 * 60 * 1000)
            const earlierEnd = new Date(Date.now() + 2 * 60 * 60 * 1000)

            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Later Event',
                        start: { dateTime: laterStart.toISOString() },
                        end: { dateTime: laterEnd.toISOString() },
                    },
                    {
                        id: 'event2',
                        summary: 'Earlier Event',
                        start: { dateTime: earlierStart.toISOString() },
                        end: { dateTime: earlierEnd.toISOString() },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events).toHaveLength(2)
            expect(events[0].title).toBe('Earlier Event')
            expect(events[1].title).toBe('Later Event')
        })

        it('handles events without titles', () => {
            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].title).toBe('(No title)')
        })

        it('handles events with all optional fields', () => {
            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Meeting',
                        description: 'Team standup',
                        location: 'Conference Room A',
                        hangoutLink: 'https://meet.google.com/abc-defg-hij',
                        htmlLink: 'https://calendar.google.com/event?id=event1',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                        calendarName: 'Work Calendar',
                        calendarColor: '#ff0000',
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].title).toBe('Meeting')
            expect(events[0].description).toBe('Team standup')
            expect(events[0].location).toBe('Conference Room A')
            expect(events[0].hangoutLink).toBe(
                'https://meet.google.com/abc-defg-hij'
            )
            expect(events[0].htmlLink).toBe(
                'https://calendar.google.com/event?id=event1'
            )
            expect(events[0].calendarName).toBe('Work Calendar')
            expect(events[0].calendarColor).toBe('#ff0000')
        })

        it('handles events with missing optional fields', () => {
            const mockData = {
                calendars: [],
                events: [
                    {
                        id: 'event1',
                        summary: 'Meeting',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const events = backend.getEvents()

            expect(events[0].description).toBe('')
            expect(events[0].location).toBe('')
            expect(events[0].hangoutLink).toBe('')
            expect(events[0].htmlLink).toBe('')
            expect(events[0].calendarName).toBe('')
            expect(events[0].calendarColor).toBe('')
        })
    })

    describe('getCalendars', () => {
        it('returns empty array when no calendars exist', () => {
            const backend = new GoogleCalendarProvider()
            expect(backend.getCalendars()).toEqual([])
        })

        it('returns calendars from stored data', () => {
            const mockData = {
                calendars: [
                    { id: 'cal1', summary: 'Work' },
                    { id: 'cal2', summary: 'Personal' },
                ],
                events: [],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            const calendars = backend.getCalendars()

            expect(calendars).toHaveLength(2)
            expect(calendars[0].id).toBe('cal1')
            expect(calendars[1].id).toBe('cal2')
        })
    })

    describe('fetchCalendarList', () => {
        it('throws error when not signed in', async () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(false)

            const backend = new GoogleCalendarProvider()

            await expect(backend.fetchCalendarList()).rejects.toThrow(
                'Not signed in to Google account'
            )
        })

        it('fetches calendar list for settings UI', async () => {
            const mockCalendarsResponse = {
                items: [
                    {
                        id: 'cal1',
                        summary: 'Work',
                        backgroundColor: '#ff0000',
                        primary: true,
                    },
                    {
                        id: 'cal2',
                        summary: 'Personal',
                        backgroundColor: '#00ff00',
                        primary: false,
                    },
                ],
            }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const calendars = await backend.fetchCalendarList()

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/users/me/calendarList?maxResults=50'
            )

            expect(calendars).toHaveLength(2)
            expect(calendars[0].id).toBe('cal1')
            expect(calendars[0].name).toBe('Work')
            expect(calendars[0].color).toBe('#ff0000')
            expect(calendars[0].primary).toBe(true)
        })

        it('handles calendars without background color', async () => {
            const mockCalendarsResponse = {
                items: [
                    {
                        id: 'cal1',
                        summary: 'Work',
                        primary: false,
                    },
                ],
            }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const calendars = await backend.fetchCalendarList()

            expect(calendars[0].color).toBe('')
        })

        it('handles calendars without primary flag', async () => {
            const mockCalendarsResponse = {
                items: [
                    {
                        id: 'cal1',
                        summary: 'Work',
                        backgroundColor: '#ff0000',
                    },
                ],
            }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const calendars = await backend.fetchCalendarList()

            expect(calendars[0].primary).toBe(false)
        })

        it('handles empty calendar list', async () => {
            const mockCalendarsResponse = { items: [] }

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const calendars = await backend.fetchCalendarList()

            expect(calendars).toEqual([])
        })

        it('handles missing items in response', async () => {
            const mockCalendarsResponse = {}

            mockApiRequest.mockResolvedValueOnce(mockCalendarsResponse)

            const backend = new GoogleCalendarProvider()
            const calendars = await backend.fetchCalendarList()

            expect(calendars).toEqual([])
        })
    })

    describe('createMeetLink', () => {
        it('throws error when not signed in', async () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(false)

            const backend = new GoogleCalendarProvider()

            await expect(backend.createMeetLink()).rejects.toThrow(
                'Not signed in to Google account'
            )
        })

        it('creates event with conference data and returns Meet link', async () => {
            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse) // Create event
                .mockResolvedValueOnce(undefined) // Delete event

            const backend = new GoogleCalendarProvider()
            const meetLink = await backend.createMeetLink()

            expect(meetLink).toBe('https://meet.google.com/abc-defg-hij')

            // Verify create event call
            expect(mockApiRequest).toHaveBeenCalledWith(
                '/calendars/primary/events?conferenceDataVersion=1',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Instant Meeting'),
                })
            )

            // Verify delete event call
            expect(mockApiRequest).toHaveBeenCalledWith(
                '/calendars/primary/events/temp-event-123',
                expect.objectContaining({
                    method: 'DELETE',
                })
            )
        })

        it('uses UUID for conference request ID', async () => {
            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse)
                .mockResolvedValueOnce(undefined)

            const backend = new GoogleCalendarProvider()
            await backend.createMeetLink()

            expect(uuid.generateUUID).toHaveBeenCalled()

            const createCall = mockApiRequest.mock.calls[0]
            const body = JSON.parse(createCall[1].body as string)
            expect(body.conferenceData.createRequest.requestId).toBe(
                'mock-uuid-123'
            )
        })

        it('includes conference solution key for hangoutsMeet', async () => {
            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse)
                .mockResolvedValueOnce(undefined)

            const backend = new GoogleCalendarProvider()
            await backend.createMeetLink()

            const createCall = mockApiRequest.mock.calls[0]
            const body = JSON.parse(createCall[1].body as string)
            expect(
                body.conferenceData.createRequest.conferenceSolutionKey.type
            ).toBe('hangoutsMeet')
        })

        it('creates event with 1-hour duration', async () => {
            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse)
                .mockResolvedValueOnce(undefined)

            const testDate = new Date('2025-12-25T10:00:00.000Z')
            vi.setSystemTime(testDate)

            const backend = new GoogleCalendarProvider()
            await backend.createMeetLink()

            const createCall = mockApiRequest.mock.calls[0]
            const body = JSON.parse(createCall[1].body as string)

            const startTime = new Date(body.start.dateTime)
            const endTime = new Date(body.end.dateTime)

            expect(endTime.getTime() - startTime.getTime()).toBe(
                60 * 60 * 1000
            ) // 1 hour

            vi.useRealTimers()
        })

        it('includes timezone in event', async () => {
            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse)
                .mockResolvedValueOnce(undefined)

            const backend = new GoogleCalendarProvider()
            await backend.createMeetLink()

            const createCall = mockApiRequest.mock.calls[0]
            const body = JSON.parse(createCall[1].body as string)

            expect(body.start.timeZone).toBeDefined()
            expect(body.end.timeZone).toBeDefined()
        })

        it('throws error when no Meet link is returned', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            const mockCreateResponse = {
                id: 'temp-event-123',
                // No hangoutLink
            }

            mockApiRequest.mockResolvedValueOnce(mockCreateResponse)

            const backend = new GoogleCalendarProvider()

            await expect(backend.createMeetLink()).rejects.toThrow(
                'No Meet link returned from Google'
            )

            consoleErrorSpy.mockRestore()
        })

        it('returns Meet link even if delete fails', async () => {
            const consoleWarnSpy = vi
                .spyOn(console, 'warn')
                .mockImplementation(() => {})

            const mockCreateResponse = {
                id: 'temp-event-123',
                hangoutLink: 'https://meet.google.com/abc-defg-hij',
            }

            mockApiRequest
                .mockResolvedValueOnce(mockCreateResponse)
                .mockRejectedValueOnce(new Error('Delete failed'))

            const backend = new GoogleCalendarProvider()
            const meetLink = await backend.createMeetLink()

            expect(meetLink).toBe('https://meet.google.com/abc-defg-hij')
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[GoogleCalendar]',
                'Failed to delete temporary event:',
                expect.any(Error)
            )

            consoleWarnSpy.mockRestore()
        })

        it('throws error on create event API failure', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            mockApiRequest.mockRejectedValueOnce(
                new Error('HTTP 403: Forbidden')
            )

            const backend = new GoogleCalendarProvider()

            await expect(backend.createMeetLink()).rejects.toThrow(
                'Failed to create Meet link'
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[GoogleCalendar]',
                'Failed to create Meet link:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe('clearLocalData', () => {
        it('removes data from localStorage', () => {
            mockLocalStorage._store['google_calendar_data'] = JSON.stringify({
                calendars: [],
                events: [],
            })

            const backend = new GoogleCalendarProvider()
            backend.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'google_calendar_data'
            )
        })

        it('resets data to empty state', () => {
            const mockData = {
                calendars: [{ id: 'cal1', summary: 'Work' }],
                events: [
                    {
                        id: 'event1',
                        summary: 'Meeting',
                        start: { dateTime: new Date().toISOString() },
                        end: {
                            dateTime: new Date(
                                Date.now() + 60 * 60 * 1000
                            ).toISOString(),
                        },
                    },
                ],
            }

            mockLocalStorage._store['google_calendar_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleCalendarProvider()
            backend.clearLocalData()

            expect(backend.getEvents()).toEqual([])
            expect(backend.getCalendars()).toEqual([])
        })
    })
})

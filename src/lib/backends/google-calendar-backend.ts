import * as googleAuth from './google-auth'
import { generateUUID } from '../uuid'
import type { CalendarBackendConfig, CalendarEvent, GoogleCalendar } from '../types'

interface GoogleCalendarItem {
    id: string
    summary: string
    backgroundColor?: string
    selected?: boolean
    primary?: boolean
}

interface GoogleCalendarEvent {
    id: string
    status?: string
    summary?: string
    description?: string
    location?: string
    hangoutLink?: string
    htmlLink?: string
    start?: {
        date?: string
        dateTime?: string
    }
    end?: {
        date?: string
        dateTime?: string
    }
    calendarId?: string
    calendarName?: string
    calendarColor?: string
}

interface GoogleCalendarData {
    calendars?: GoogleCalendarItem[]
    events?: GoogleCalendarEvent[]
    timestamp?: number
}

interface CalendarListResponse {
    items?: GoogleCalendarItem[]
}

interface EventsListResponse {
    items?: GoogleCalendarEvent[]
}

interface CreateEventResponse {
    id: string
    hangoutLink?: string
}

/**
 * Google Calendar API client for Web Applications
 * Uses shared Google OAuth module for authentication
 */
class GoogleCalendarBackend {
    private baseUrl: string
    private dataKey: string
    private cacheExpiry: number
    private data: GoogleCalendarData

    constructor(_config: CalendarBackendConfig = {}) {
        this.baseUrl = 'https://www.googleapis.com/calendar/v3'
        this.dataKey = 'google_calendar_data'
        this.cacheExpiry = 5 * 60 * 1000 // 5 minutes

        // Migrate old storage keys if needed
        googleAuth.migrateStorageKeys()

        const storedData = localStorage.getItem(this.dataKey)
        this.data = storedData ? JSON.parse(storedData) as GoogleCalendarData : {}
    }

    /**
     * Check if cache is stale
     */
    isCacheStale(): boolean {
        if (!this.data.timestamp) return true
        return Date.now() - this.data.timestamp >= this.cacheExpiry
    }

    /**
     * Check if signed in (uses shared Google OAuth)
     */
    getIsSignedIn(): boolean {
        return googleAuth.isSignedIn()
    }

    /**
     * Make an authenticated API request with auto-refresh
     * Delegates to shared googleAuth.apiRequest
     */
    private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`
        return googleAuth.apiRequest<T>(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })
    }

    /**
     * Get start and end of today in ISO format
     */
    private getTodayBounds(): { timeMin: string; timeMax: string } {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

        return {
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString()
        }
    }

    /**
     * Sync calendar events from Google Calendar API
     */
    async sync(selectedCalendarIds: string[] = []): Promise<GoogleCalendarData> {
        if (!this.getIsSignedIn()) {
            throw new Error('Not signed in to Google account')
        }

        try {
            // First get list of calendars
            const calendarsData = await this.apiRequest<CalendarListResponse>('/users/me/calendarList?maxResults=50')
            this.data.calendars = (calendarsData.items || []).filter(cal => cal.selected !== false)

            // Filter to selected calendars if specified
            let calendarsToSync = this.data.calendars
            if (selectedCalendarIds && selectedCalendarIds.length > 0) {
                calendarsToSync = this.data.calendars.filter(cal =>
                    selectedCalendarIds.includes(cal.id)
                )
            }

            // Get today's events from calendars
            const { timeMin, timeMax } = this.getTodayBounds()

            const eventPromises = calendarsToSync.map(async (calendar) => {
                try {
                    const eventsData = await this.apiRequest<EventsListResponse>(
                        `/calendars/${encodeURIComponent(calendar.id)}/events?` +
                        `timeMin=${encodeURIComponent(timeMin)}&` +
                        `timeMax=${encodeURIComponent(timeMax)}&` +
                        `singleEvents=true&` +
                        `orderBy=startTime&` +
                        `maxResults=50`
                    )

                    return (eventsData.items || []).map(event => ({
                        ...event,
                        calendarId: calendar.id,
                        calendarName: calendar.summary,
                        calendarColor: calendar.backgroundColor
                    }))
                } catch (err) {
                    console.warn(`Failed to fetch events from calendar "${calendar.summary}":`, err)
                    return []
                }
            })

            const eventArrays = await Promise.all(eventPromises)
            this.data.events = eventArrays.flat()
            this.data.timestamp = Date.now()

            localStorage.setItem(this.dataKey, JSON.stringify(this.data))
            return this.data
        } catch (error) {
            console.error('Google Calendar sync error:', error)
            throw error
        }
    }

    /**
     * Get today's events, sorted by start time
     */
    getEvents(): CalendarEvent[] {
        if (!this.data.events) return []

        const now = new Date()

        return this.data.events
            .filter(event => {
                // Filter out cancelled events
                if (event.status === 'cancelled') return false
                return true
            })
            .map(event => {
                const isAllDay = !!event.start?.date && !event.start?.dateTime

                let startTime: Date
                let endTime: Date

                if (isAllDay) {
                    startTime = new Date(event.start!.date + 'T00:00:00')
                    endTime = new Date(event.end!.date + 'T00:00:00')
                } else {
                    startTime = new Date(event.start!.dateTime!)
                    endTime = new Date(event.end!.dateTime!)
                }

                const isPast = endTime < now
                const isOngoing = startTime <= now && endTime > now

                return {
                    id: event.id,
                    title: event.summary || '(No title)',
                    description: event.description || '',
                    location: event.location || '',
                    hangoutLink: event.hangoutLink || '',
                    startTime,
                    endTime,
                    isAllDay,
                    isPast,
                    isOngoing,
                    calendarName: event.calendarName || '',
                    calendarColor: event.calendarColor || '',
                    htmlLink: event.htmlLink || ''
                }
            })
            .sort((a, b) => {
                // All-day events first, then by start time
                if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
                return a.startTime.getTime() - b.startTime.getTime()
            })
    }

    /**
     * Get list of available calendars (requires sync to be called first)
     */
    getCalendars(): GoogleCalendarItem[] {
        return this.data.calendars || []
    }

    /**
     * Fetch calendar list from API (for settings UI)
     */
    async fetchCalendarList(): Promise<GoogleCalendar[]> {
        if (!this.getIsSignedIn()) {
            throw new Error('Not signed in to Google account')
        }

        const calendarsData = await this.apiRequest<CalendarListResponse>('/users/me/calendarList?maxResults=50')
        const calendars: GoogleCalendar[] = (calendarsData.items || []).map(cal => ({
            id: cal.id,
            name: cal.summary,
            color: cal.backgroundColor || '',
            primary: cal.primary || false
        }))

        return calendars
    }

    /**
     * Clear local storage
     */
    clearLocalData(): void {
        localStorage.removeItem(this.dataKey)
        this.data = {}
    }

    /**
     * Create an instant Google Meet link
     * Creates a temporary calendar event with conference data and returns the Meet link
     */
    async createMeetLink(): Promise<string> {
        if (!this.getIsSignedIn()) {
            throw new Error('Not signed in to Google account')
        }

        // Generate a unique request ID for idempotency
        const requestId = generateUUID()

        // Create a minimal event with conference data
        const now = new Date()
        const endTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

        const event = {
            summary: 'Instant Meeting',
            start: {
                dateTime: now.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            conferenceData: {
                createRequest: {
                    requestId: requestId,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                    }
                }
            }
        }

        try {
            const response = await this.apiRequest<CreateEventResponse>(
                '/calendars/primary/events?conferenceDataVersion=1',
                {
                    method: 'POST',
                    body: JSON.stringify(event)
                }
            )

            if (!response.hangoutLink) {
                throw new Error('No Meet link returned from Google')
            }

            // Delete the temporary event (Meet link will still work)
            try {
                await this.apiRequest<void>(`/calendars/primary/events/${response.id}`, {
                    method: 'DELETE'
                })
            } catch (deleteError) {
                console.warn('Failed to delete temporary event:', deleteError)
                // Non-critical, Meet link still works
            }

            return response.hangoutLink
        } catch (error) {
            console.error('Failed to create Meet link:', error)
            throw error
        }
    }
}

export default GoogleCalendarBackend

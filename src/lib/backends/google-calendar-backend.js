/**
 * Google Calendar API client for Web Applications
 * Shares OAuth token with Google Tasks backend
 */
class GoogleCalendarBackend {
    constructor(config = {}) {
        this.baseUrl = 'https://www.googleapis.com/calendar/v3'

        this.dataKey = 'google_calendar_data'
        this.tokenKey = 'google_tasks_token' // Shared with Google Tasks
        this.tokenExpiryKey = 'google_tasks_token_expiry' // Shared with Google Tasks

        this.data = JSON.parse(localStorage.getItem(this.dataKey) ?? '{}')
        this.accessToken = localStorage.getItem(this.tokenKey)
        this.tokenExpiry = localStorage.getItem(this.tokenExpiryKey)
        this.isSignedIn = !!this.accessToken && !this.isTokenExpired()
    }

    /**
     * Check if current token is expired
     */
    isTokenExpired() {
        if (!this.tokenExpiry) return true
        return Date.now() > parseInt(this.tokenExpiry, 10)
    }

    /**
     * Check if signed in (token shared with Google Tasks)
     */
    getIsSignedIn() {
        this.accessToken = localStorage.getItem(this.tokenKey)
        this.tokenExpiry = localStorage.getItem(this.tokenExpiryKey)
        if (this.accessToken && this.isTokenExpired()) {
            this.isSignedIn = false
        } else {
            this.isSignedIn = !!this.accessToken
        }
        return this.isSignedIn
    }

    /**
     * Make an authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        this.accessToken = localStorage.getItem(this.tokenKey)

        if (!this.accessToken) {
            throw new Error('Not signed in')
        }

        const url = `${this.baseUrl}${endpoint}`
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication expired. Please sign in again.')
            }
            throw new Error(
                `API request failed: ${response.status} ${response.statusText}`
            )
        }

        return response.json()
    }

    /**
     * Get start and end of today in ISO format
     */
    getTodayBounds() {
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
    async sync() {
        if (!this.getIsSignedIn()) {
            throw new Error('Not signed in to Google account')
        }

        try {
            // First get list of calendars
            const calendarsData = await this.apiRequest('/users/me/calendarList?maxResults=50')
            this.data.calendars = (calendarsData.items || []).filter(cal => cal.selected !== false)

            console.log('Google Calendar: found', this.data.calendars.length, 'calendars')

            // Get today's events from all calendars
            const { timeMin, timeMax } = this.getTodayBounds()

            const eventPromises = this.data.calendars.map(async (calendar) => {
                try {
                    const eventsData = await this.apiRequest(
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

            console.log('Google Calendar: total events synced:', this.data.events.length)

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
    getEvents() {
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

                let startTime = null
                let endTime = null

                if (isAllDay) {
                    startTime = new Date(event.start.date + 'T00:00:00')
                    endTime = new Date(event.end.date + 'T00:00:00')
                } else {
                    startTime = new Date(event.start.dateTime)
                    endTime = new Date(event.end.dateTime)
                }

                const isPast = endTime < now
                const isOngoing = startTime <= now && endTime > now

                return {
                    id: event.id,
                    title: event.summary || '(No title)',
                    description: event.description || '',
                    location: event.location || '',
                    startTime,
                    endTime,
                    isAllDay,
                    isPast,
                    isOngoing,
                    calendarName: event.calendarName,
                    calendarColor: event.calendarColor,
                    htmlLink: event.htmlLink
                }
            })
            .sort((a, b) => {
                // All-day events first, then by start time
                if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
                return a.startTime - b.startTime
            })
    }

    /**
     * Clear local storage
     */
    clearLocalData() {
        localStorage.removeItem(this.dataKey)
        this.data = {}
    }
}

export default GoogleCalendarBackend

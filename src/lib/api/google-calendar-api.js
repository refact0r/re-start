import { isChrome } from '../utils/browser-detect.js'

class GoogleCalendarAPI {
    constructor() {
        this.scopes = ['https://www.googleapis.com/auth/calendar.readonly']
        this.baseUrl = 'https://www.googleapis.com/calendar/v3'
        this.accessToken = null
        this.tokenPromise = null
    }

    async getAuthToken(interactive = false) {
        if (!isChrome()) {
            throw new Error(
                'Chrome identity API not available. Google Calendar only works in Chrome.'
            )
        }

        if (this.tokenPromise) {
            return this.tokenPromise
        }

        this.tokenPromise = new Promise((resolve, reject) => {
            chrome.identity.getAuthToken(
                {
                    interactive,
                    scopes: this.scopes,
                },
                (token) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message))
                        return
                    }

                    if (!token) {
                        reject(new Error('No token returned'))
                        return
                    }

                    this.accessToken = token
                    resolve(token)
                }
            )
        })

        try {
            return await this.tokenPromise
        } finally {
            this.tokenPromise = null
        }
    }

    async signIn() {
        await this.getAuthToken(true)
        return this.accessToken
    }

    async signOut() {
        if (!isChrome()) return

        let token = this.accessToken

        if (!token) {
            try {
                token = await this.getAuthToken(false)
            } catch {
                token = null
            }
        }

        if (token) {
            await new Promise((resolve) => {
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    resolve()
                })
            })
        }

        this.accessToken = null
    }

    async apiRequest(endpoint, options = {}, isRetry = false) {
        const token = await this.getAuthToken(false)
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401 && !isRetry) {
                await new Promise((resolve) => {
                    chrome.identity.removeCachedAuthToken({ token }, () =>
                        resolve()
                    )
                })
                this.accessToken = null
                return this.apiRequest(endpoint, options, true)
            }

            if (response.status === 401) {
                throw new Error(
                    'Authentication expired. Please sign in again.'
                )
            }

            throw new Error(
                `Calendar API request failed: ${response.status} ${response.statusText}`
            )
        }

        if (
            response.status === 204 ||
            response.headers.get('content-length') === '0'
        ) {
            return null
        }

        return response.json()
    }

    async getCalendars() {
        const params = new URLSearchParams({
            minAccessRole: 'reader',
            showDeleted: 'false',
            showHidden: 'false',
            maxResults: '250',
        })

        const data = await this.apiRequest(`/users/me/calendarList?${params}`)

        return (data?.items || [])
            .filter((calendar) => !calendar.deleted)
            .map((calendar) => ({
                id: calendar.id,
                name: calendar.summary || '(untitled calendar)',
                primary: Boolean(calendar.primary),
            }))
            .sort((a, b) => {
                if (a.primary !== b.primary) return a.primary ? -1 : 1
                return a.name.localeCompare(b.name)
            })
    }

    async getEventsForCalendar(calendar, maxResults, timeMin) {
        const params = new URLSearchParams({
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: String(maxResults),
            timeMin,
        })

        const data = await this.apiRequest(
            `/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`
        )

        return (data?.items || [])
            .filter((event) => event.status !== 'cancelled' && event.start)
            .map((event) => {
                const isAllDay = Boolean(
                    event.start?.date && !event.start?.dateTime
                )
                const startRaw = event.start?.dateTime || event.start?.date
                const endRaw = event.end?.dateTime || event.end?.date

                const start = isAllDay
                    ? new Date(`${startRaw}T00:00:00`)
                    : new Date(startRaw)
                const end = endRaw
                    ? isAllDay
                        ? new Date(`${endRaw}T00:00:00`)
                        : new Date(endRaw)
                    : null

                return {
                    id: event.id,
                    title: event.summary || '(untitled)',
                    location: event.location || '',
                    link: event.htmlLink || '',
                    allDay: isAllDay,
                    calendarId: calendar.id,
                    calendarName: calendar.name,
                    calendarPrimary: calendar.primary,
                    start,
                    end,
                }
            })
    }

    async getUpcomingEvents(maxResults = 5, visibleCalendarIds = null) {
        const safeMaxResults = Math.min(
            20,
            Math.max(1, parseInt(maxResults, 10) || 5)
        )
        const calendars = await this.getCalendars()
        if (calendars.length === 0) return []

        let selectedCalendars = calendars
        if (Array.isArray(visibleCalendarIds)) {
            const visibleSet = new Set(
                visibleCalendarIds.map((calendarId) => String(calendarId))
            )
            selectedCalendars = calendars.filter((calendar) =>
                visibleSet.has(String(calendar.id))
            )
        }

        if (selectedCalendars.length === 0) return []

        const perCalendarLimit = Math.max(10, safeMaxResults)
        const timeMin = new Date().toISOString()
        const eventArrays = await Promise.all(
            selectedCalendars.map((calendar) =>
                this.getEventsForCalendar(calendar, perCalendarLimit, timeMin)
            )
        )

        return eventArrays
            .flat()
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, safeMaxResults)
    }
}

export default GoogleCalendarAPI

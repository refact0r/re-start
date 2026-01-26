/**
 * Google Calendar API client with OAuth flow
 * Uses user-provided credentials (client_id + client_secret)
 */
class GoogleCalendarBackend {
    constructor(clientId, clientSecret) {
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.scope = 'https://www.googleapis.com/auth/calendar.readonly'
        this.tokenEndpoint = 'https://oauth2.googleapis.com/token'
        this.calendarEndpoint = 'https://www.googleapis.com/calendar/v3'
    }

    /**
     * Get the redirect URI for OAuth
     * Uses Chrome's extension redirect URL when available
     */
    getRedirectUri() {
        if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
            return chrome.identity.getRedirectURL()
        }
        return 'http://localhost'
    }

    /**
     * Static method to get redirect URI without instantiating
     */
    static getRedirectUrl() {
        if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
            return chrome.identity.getRedirectURL()
        }
        return 'http://localhost'
    }

    /**
     * Start OAuth flow
     * Uses chrome.identity.launchWebAuthFlow in Chrome extensions,
     * falls back to manual code entry otherwise
     */
    async signIn() {
        // Check if we're in a Chrome extension context
        if (typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
            return this._signInWithChromeIdentity()
        } else {
            throw new Error('OAuth sign-in requires Chrome extension environment')
        }
    }

    /**
     * Sign in using Chrome's identity API
     * This intercepts the localhost redirect automatically
     */
    async _signInWithChromeIdentity() {
        const authUrl = this._buildAuthUrl()

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true,
                },
                async (redirectUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message))
                        return
                    }

                    if (!redirectUrl) {
                        reject(new Error('No redirect URL received'))
                        return
                    }

                    try {
                        // Extract auth code from redirect URL
                        const url = new URL(redirectUrl)
                        const code = url.searchParams.get('code')
                        const error = url.searchParams.get('error')

                        if (error) {
                            reject(new Error(`OAuth error: ${error}`))
                            return
                        }

                        if (!code) {
                            reject(new Error('No authorization code received'))
                            return
                        }

                        // Exchange code for tokens
                        const tokens = await this._exchangeCodeForTokens(code)
                        resolve(tokens)
                    } catch (e) {
                        reject(e)
                    }
                }
            )
        })
    }

    /**
     * Build the Google OAuth authorization URL
     */
    _buildAuthUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.getRedirectUri(),
            response_type: 'code',
            scope: this.scope,
            access_type: 'offline',
            prompt: 'consent', // Force consent to get refresh token
        })

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    /**
     * Exchange authorization code for access + refresh tokens
     */
    async _exchangeCodeForTokens(code) {
        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.getRedirectUri(),
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
        }

        const tokens = await response.json()
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
        }
    }

    /**
     * Get a fresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
        }

        const tokens = await response.json()
        return {
            accessToken: tokens.access_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
        }
    }

    /**
     * Fetch today's calendar events
     */
    async getTodayEvents(accessToken) {
        // Get start and end of today in local timezone
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

        const params = new URLSearchParams({
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
        })

        const response = await fetch(
            `${this.calendarEndpoint}/calendars/primary/events?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        )

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('ACCESS_TOKEN_EXPIRED')
            }
            throw new Error(`Failed to fetch events: ${response.status}`)
        }

        const data = await response.json()
        
        // Map to our event structure
        return (data.items || []).map(event => ({
            id: event.id,
            title: event.summary || '(no title)',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            allDay: !event.start.dateTime,
            description: event.description || '',
            location: event.location || '',
        }))
    }
}

export default GoogleCalendarBackend

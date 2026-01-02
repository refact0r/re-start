/**
 * Google OAuth constants
 * Storage keys, API URLs, scopes, and configuration
 */

// Storage keys for localStorage
export const TOKEN_KEY = 'google_oauth_token'
export const TOKEN_EXPIRY_KEY = 'google_oauth_token_expiry'
export const USER_EMAIL_KEY = 'google_user_email'
export const USER_ID_KEY = 'google_user_id'
export const SCOPES_KEY = 'google_oauth_scopes'

// Required scope for creating Meet links
export const MEET_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

// Backend API URL - always relative, Vite proxy handles dev routing
export const API_URL = ''

// Token refresh buffer (5 minutes before expiry)
export const REFRESH_BUFFER_MS = 5 * 60 * 1000

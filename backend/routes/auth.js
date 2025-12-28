import { Router } from 'express'
import crypto from 'crypto'
import { storeToken, getToken, deleteToken } from '../db/tokens.js'

const router = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

// In-memory state storage (for CSRF protection)
const pendingStates = new Map()

/**
 * GET /api/auth/google/url
 * Generate OAuth URL for the frontend to redirect to
 */
router.get('/google/url', (req, res) => {
    const userId = req.query.user_id
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' })
    }

    const state = crypto.randomBytes(32).toString('hex')
    pendingStates.set(state, { userId, createdAt: Date.now() })

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    for (const [key, value] of pendingStates.entries()) {
        if (value.createdAt < tenMinutesAgo) {
            pendingStates.delete(key)
        }
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${BACKEND_URL}/api/auth/google/callback`,
        response_type: 'code',
        scope: SCOPES,
        state: state,
        access_type: 'offline',
        prompt: 'consent'
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    res.json({ url: authUrl })
})

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback from Google
 */
router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query

    if (error) {
        return res.redirect(`${FRONTEND_URL}?auth_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
        return res.redirect(`${FRONTEND_URL}?auth_error=missing_params`)
    }

    const stateData = pendingStates.get(state)
    if (!stateData) {
        return res.redirect(`${FRONTEND_URL}?auth_error=invalid_state`)
    }
    pendingStates.delete(state)

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: `${BACKEND_URL}/api/auth/google/callback`
            })
        })

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json()
            console.error('Token exchange failed:', errorData)
            return res.redirect(`${FRONTEND_URL}?auth_error=token_exchange_failed`)
        }

        const tokens = await tokenResponse.json()

        // Get user email
        let email = null
        try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            })
            if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json()
                email = userInfo.email
            }
        } catch (e) {
            console.warn('Failed to fetch user email:', e)
        }

        // Store refresh token
        if (tokens.refresh_token) {
            storeToken(stateData.userId, tokens.refresh_token, email)
        }

        // Redirect to frontend with success and token info
        const params = new URLSearchParams({
            auth_success: 'true',
            access_token: tokens.access_token,
            expires_in: tokens.expires_in || '3600',
            email: email || ''
        })

        res.redirect(`${FRONTEND_URL}?${params}`)
    } catch (error) {
        console.error('OAuth callback error:', error)
        res.redirect(`${FRONTEND_URL}?auth_error=server_error`)
    }
})

/**
 * POST /api/auth/google/refresh
 * Get a new access token using stored refresh token
 */
router.post('/google/refresh', async (req, res) => {
    const { user_id } = req.body
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required' })
    }

    const tokenData = getToken(user_id)
    if (!tokenData) {
        return res.status(401).json({ error: 'not_authenticated' })
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokenData.refresh_token,
                grant_type: 'refresh_token'
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Token refresh failed:', errorData)

            // If refresh token is invalid, delete it
            if (errorData.error === 'invalid_grant') {
                deleteToken(user_id)
                return res.status(401).json({ error: 'refresh_token_expired' })
            }

            return res.status(500).json({ error: 'refresh_failed' })
        }

        const tokens = await response.json()

        // If Google returns a new refresh token, update it
        if (tokens.refresh_token) {
            storeToken(user_id, tokens.refresh_token, tokenData.email)
        }

        res.json({
            access_token: tokens.access_token,
            expires_in: tokens.expires_in || 3600,
            email: tokenData.email
        })
    } catch (error) {
        console.error('Token refresh error:', error)
        res.status(500).json({ error: 'server_error' })
    }
})

/**
 * POST /api/auth/google/logout
 * Revoke tokens and delete from database
 */
router.post('/google/logout', async (req, res) => {
    const { user_id } = req.body
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required' })
    }

    const tokenData = getToken(user_id)
    if (tokenData) {
        // Revoke the refresh token at Google
        try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.refresh_token}`, {
                method: 'POST'
            })
        } catch (e) {
            console.warn('Failed to revoke token at Google:', e)
        }

        deleteToken(user_id)
    }

    res.json({ success: true })
})

/**
 * GET /api/auth/google/status
 * Check if user has stored credentials
 */
router.get('/google/status', (req, res) => {
    const { user_id } = req.query
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required' })
    }

    const tokenData = getToken(user_id)
    res.json({
        authenticated: !!tokenData,
        email: tokenData?.email || null
    })
})

export default router

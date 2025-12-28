import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import authRoutes from './routes/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3004

app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
app.use('/api/auth', authRoutes)

// Serve static frontend files
app.use(express.static(join(__dirname, 'public')))

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'))
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

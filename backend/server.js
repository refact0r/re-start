import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
app.use('/api/auth', authRoutes)

// Start server
app.listen(PORT, () => {
    console.log(`OAuth backend running on port ${PORT}`)
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
    console.log(`Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`)
})

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'tokens.db')

const db = new Database(dbPath)

// Initialize database
db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
        user_id TEXT PRIMARY KEY,
        refresh_token TEXT NOT NULL,
        email TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
    )
`)

/**
 * Store or update refresh token for a user
 */
export function storeToken(userId, refreshToken, email = null) {
    const stmt = db.prepare(`
        INSERT INTO tokens (user_id, refresh_token, email, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(user_id) DO UPDATE SET
            refresh_token = excluded.refresh_token,
            email = COALESCE(excluded.email, tokens.email),
            updated_at = unixepoch()
    `)
    stmt.run(userId, refreshToken, email)
}

/**
 * Get refresh token for a user
 */
export function getToken(userId) {
    const stmt = db.prepare('SELECT * FROM tokens WHERE user_id = ?')
    return stmt.get(userId)
}

/**
 * Delete token for a user
 */
export function deleteToken(userId) {
    const stmt = db.prepare('DELETE FROM tokens WHERE user_id = ?')
    stmt.run(userId)
}

/**
 * Check if user has a stored token
 */
export function hasToken(userId) {
    const stmt = db.prepare('SELECT 1 FROM tokens WHERE user_id = ?')
    return !!stmt.get(userId)
}

export default { storeToken, getToken, deleteToken, hasToken }

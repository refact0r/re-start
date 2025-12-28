// Unsplash API module for daily background images
// Topics: abstract, nature, city scenery
// Images update daily with lazy refresh

const ACCESS_KEY = 'REMOVED_API_KEY'
const API_URL = 'https://api.unsplash.com/photos/random'
const STORAGE_KEY = 'unsplash_background'

// Topics to randomly select from for variety
const TOPICS = ['abstract', 'nature', 'city', 'architecture', 'landscape']

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

/**
 * Get a random topic from the list
 */
function getRandomTopic() {
    return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}

/**
 * Load cached background data from localStorage
 * @returns {Object|null} Cached background data or null
 */
export function loadCachedBackground() {
    try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
            return JSON.parse(cached)
        }
    } catch (e) {
        console.error('Failed to load cached background:', e)
    }
    return null
}

/**
 * Save background data to localStorage
 * @param {Object} data Background data to cache
 */
function saveBackground(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
        console.error('Failed to save background:', e)
    }
}

/**
 * Clear cached background data
 */
export function clearBackgroundCache() {
    localStorage.removeItem(STORAGE_KEY)
}

/**
 * Check if the cached background is still valid (same day)
 * @returns {boolean} True if cache is valid for today
 */
export function isCacheValid() {
    const cached = loadCachedBackground()
    if (!cached || !cached.fetchDate) return false
    return cached.fetchDate === getTodayDate()
}

/**
 * Fetch a random background image from Unsplash
 * @param {string} [topic] Optional topic override
 * @returns {Promise<Object>} Background data object
 */
async function fetchFromUnsplash(topic) {
    const query = topic || getRandomTopic()

    const params = new URLSearchParams({
        query,
        orientation: 'landscape',
        content_filter: 'high',
    })

    const response = await fetch(`${API_URL}?${params}`, {
        headers: {
            Authorization: `Client-ID ${ACCESS_KEY}`,
        },
    })

    if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`)
    }

    const photo = await response.json()

    return {
        id: photo.id,
        url: photo.urls.regular, // Good quality, reasonable size (~1080px)
        fullUrl: photo.urls.full, // Full resolution if needed
        thumbUrl: photo.urls.small, // For quick preview/preload
        blurHash: photo.blur_hash,
        color: photo.color, // Dominant color for placeholder
        description: photo.description || photo.alt_description,
        photographer: {
            name: photo.user.name,
            username: photo.user.username,
            profileUrl: photo.user.links.html,
        },
        unsplashUrl: photo.links.html,
        downloadLocation: photo.links.download_location, // For triggering download count
        fetchDate: getTodayDate(),
        topic: query,
    }
}

/**
 * Trigger download tracking on Unsplash (required by API guidelines)
 * @param {string} downloadLocation The download_location URL
 */
async function triggerDownloadTracking(downloadLocation) {
    if (!downloadLocation) return

    try {
        await fetch(downloadLocation, {
            headers: {
                Authorization: `Client-ID ${ACCESS_KEY}`,
            },
        })
    } catch (e) {
        // Non-critical, just for Unsplash analytics
        console.warn('Failed to trigger download tracking:', e)
    }
}

/**
 * Get background image, fetching new one if needed (lazy update)
 * Returns cached version if still valid for today
 * @returns {Promise<Object>} Background data object
 */
export async function getBackground() {
    const cached = loadCachedBackground()

    // Return cached if valid for today
    if (cached && cached.fetchDate === getTodayDate()) {
        return cached
    }

    // Fetch new background
    try {
        const background = await fetchFromUnsplash()
        saveBackground(background)

        // Trigger download tracking (fire and forget)
        triggerDownloadTracking(background.downloadLocation)

        return background
    } catch (e) {
        console.error('Failed to fetch background:', e)

        // Return stale cache if available, better than nothing
        if (cached) {
            return { ...cached, stale: true }
        }

        throw e
    }
}

/**
 * Force refresh the background image (user requested)
 * @param {string} [topic] Optional specific topic
 * @returns {Promise<Object>} New background data object
 */
export async function forceRefreshBackground(topic) {
    const background = await fetchFromUnsplash(topic)
    saveBackground(background)

    // Trigger download tracking
    triggerDownloadTracking(background.downloadLocation)

    return background
}

/**
 * Get available topics for UI selection
 * @returns {string[]} Array of topic names
 */
export function getAvailableTopics() {
    return [...TOPICS]
}

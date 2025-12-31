// Date manipulation utilities for natural date parsing
// Pure date calculation functions with no external dependencies

/**
 * Returns a new Date object at midnight (start of day) for the given date
 */
export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Normalizes year values (e.g., 24 -> 2024) using current year as fallback
 */
export function normalizeYear(year: number | undefined, nowYear: number): number {
    if (year === undefined) return nowYear
    if (year < 100) return 2000 + year
    return year
}

/**
 * Adds the specified number of days to a date
 */
export function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

/**
 * Returns the next occurrence of a specific weekday (0=Sunday, 6=Saturday)
 * @param base - The reference date
 * @param targetDow - The target day of week (0-6)
 * @param isNextModifier - If true, always skips to next week (e.g., "next Monday")
 */
export function nextWeekday(base: Date, targetDow: number, isNextModifier = false): Date {
    const offsetRaw = (targetDow - base.getDay() + 7) % 7
    const offset = offsetRaw === 0 || isNextModifier ? offsetRaw + 7 : offsetRaw
    return addDays(base, offset)
}

/**
 * Returns the next weekend day (Saturday or Sunday)
 * If already on Saturday, returns Sunday
 */
export function nextWeekend(base: Date): Date {
    const dow = base.getDay()
    if (dow === 6) return addDays(base, 1) // Saturday -> Sunday
    const offset = (6 - dow + 7) % 7 || 7 // Next Saturday
    return addDays(base, offset)
}

/**
 * Parses a day number from text, handling ordinals (1st, 2nd, 3rd, etc.)
 * Returns null if invalid
 */
export function parseDayNumber(raw: string): number | null {
    if (!raw) return null
    const cleaned = raw.replace(/(st|nd|rd|th)$/i, '')
    const num = parseInt(cleaned, 10)
    if (Number.isNaN(num) || num < 1 || num > 31) return null
    return num
}

/**
 * Resolves a day token to a number, handling special cases like "first"
 */
export function resolveDayToken(token: string | undefined): number | null {
    if (!token) return null
    if (token === 'first') return 1
    return parseDayNumber(token)
}

/**
 * Bumps a date to next year if it's in the past relative to now
 * Used for ambiguous dates like "December 25" which should be future
 */
export function clampFuture(date: Date, now: Date): Date {
    if (date.getTime() >= startOfDay(now).getTime()) return date
    const bumped = new Date(date)
    bumped.setFullYear(date.getFullYear() + 1)
    return bumped
}

/**
 * Constructs a Date from month/day/year components
 * If year is omitted, uses current year and clamps to future
 */
export function buildDate(month: number, day: number | null, year: number | undefined, now: Date): Date {
    const y = normalizeYear(year, now.getFullYear())
    const targetDay = day || 1
    let candidate = new Date(y, month, targetDay)
    if (year === undefined) {
        candidate = clampFuture(candidate, now)
    }
    return candidate
}

/**
 * Applies time to a date, handling AM/PM conversion
 * @param date - The base date to apply time to
 * @param hour - The hour (0-23 or 1-12 depending on ampmProvided)
 * @param minute - The minute (defaults to 0 if undefined)
 * @param ampmProvided - 'am', 'a', 'pm', 'p', or null for no explicit meridiem
 * @returns A new Date with the time applied
 */
export function applyTime(date: Date, hour: number, minute: number | undefined, ampmProvided: string | null): Date {
    const result = new Date(date)
    let h = hour
    const m = minute ?? 0

    if (ampmProvided === 'am' || ampmProvided === 'a') {
        if (h === 12) h = 0
    } else if (ampmProvided === 'pm' || ampmProvided === 'p') {
        if (h < 12) h += 12
    } else {
        // No explicit am/pm, favor morning; 12 defaults to 12pm per spec
        if (h === 12) {
            h = 12
        }
        // keep as-is (morning) for other cases
    }

    result.setHours(h, m, 0, 0)
    return result
}

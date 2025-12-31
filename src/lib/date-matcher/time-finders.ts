// Functions that find time expressions and combine them with dates
// Handles AM/PM times, 24-hour times, bare hours, and date-time bridging

import type { TimeMatch, DateCandidate } from '../types'
import { applyTime } from './date-utils'

/**
 * Consumer function type for processing time matches
 */
export type TimeConsumer = (time: TimeMatch) => void

/**
 * Finds time expressions with AM/PM like "3pm", "10:30 am", "2:15p"
 */
export function findTimeWithAmPm(lower: string, considerTime: TimeConsumer): void {
    const regex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)\b/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lower))) {
        const hour = parseInt(m[1], 10)
        const minute = m[2] ? parseInt(m[2], 10) : 0
        if (hour > 24 || minute > 59) continue
        considerTime({
            start: m.index,
            end: m.index + m[0].length,
            hour,
            minute,
            ampm: m[3] as 'am' | 'pm',
        })
    }
}

/**
 * Finds 24-hour time expressions like "14:30", "09:00"
 */
export function findTime24h(lower: string, considerTime: TimeConsumer): void {
    const regex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lower))) {
        considerTime({
            start: m.index,
            end: m.index + m[0].length,
            hour: parseInt(m[1], 10),
            minute: parseInt(m[2], 10),
            ampm: null,
        })
    }
}

/**
 * Finds bare hour numbers like "5" or "14"
 * These require a date context to be useful (marked with requiresDate flag)
 */
export function findBareHours(lower: string, considerTime: TimeConsumer): void {
    const regex = /\b([0-2]?\d)\b/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lower))) {
        const hour = parseInt(m[1], 10)
        if (hour > 23) continue
        considerTime({
            start: m.index,
            end: m.index + m[0].length,
            hour,
            minute: 0,
            ampm: null,
            requiresDate: true,
        })
    }
}

/**
 * Collects all time matches from the input text
 * Returns an array of TimeMatch objects for later processing
 */
export function collectTimeMatches(lower: string): TimeMatch[] {
    const matches: TimeMatch[] = []
    const push = (entry: TimeMatch): void => { matches.push(entry) }
    findTimeWithAmPm(lower, push)
    findTime24h(lower, push)
    findBareHours(lower, push)
    return matches
}

/**
 * Combines a date candidate with a time match to create a new candidate with time
 * @param candidate - The date candidate to add time to
 * @param time - The time match to combine with the date
 * @param now - Current time reference for past-time handling
 * @returns A new DateCandidate with the time applied
 */
export function combineDateAndTime(candidate: DateCandidate, time: TimeMatch, now: Date): DateCandidate {
    const withTime = applyTime(
        candidate.date,
        time.hour,
        time.minute,
        time.ampm
    )

    // If no explicit date and time already passed today, bump to tomorrow
    if (!candidate.dateProvided && withTime < now) {
        withTime.setDate(withTime.getDate() + 1)
    }

    return {
        match: {
            start: Math.min(candidate.match.start, time.start),
            end: Math.max(candidate.match.end, time.end),
        },
        date: withTime,
        hasTime: true,
        dateProvided: true,
    }
}

/**
 * Checks if a text segment can bridge a date and time expression
 * Allows short whitespace-only segments (max 4 chars)
 */
export function isBridgeable(segment: string): boolean {
    if (!segment) return false
    if (segment.length > 4) return false
    return /\s/.test(segment)
}

/**
 * Finds the best time match adjacent to a date candidate
 * Prefers times after the date, but will accept times before if bridgeable
 * @param candidate - The date candidate to find adjacent time for
 * @param times - Array of all time matches in the text
 * @param lower - Lowercased input text for bridge analysis
 * @returns The best adjacent time match, or null if none found
 */
export function findAdjacentTime(candidate: DateCandidate, times: TimeMatch[], lower: string): TimeMatch | null {
    if (!times.length) return null
    let bestAfter: TimeMatch | null = null
    for (const time of times) {
        if (time.start < candidate.match.end) continue
        const bridge = lower.slice(candidate.match.end, time.start)
        if (!isBridgeable(bridge)) continue
        if (!bestAfter || time.start < bestAfter.start) {
            bestAfter = time
        }
    }
    if (bestAfter) return bestAfter

    let bestBefore: TimeMatch | null = null
    for (const time of times) {
        if (time.end > candidate.match.start) continue
        if (time.requiresDate) continue
        const bridge = lower.slice(time.end, candidate.match.start)
        if (!isBridgeable(bridge)) continue
        if (!bestBefore || time.end > bestBefore.end) {
            bestBefore = time
        }
    }
    return bestBefore
}

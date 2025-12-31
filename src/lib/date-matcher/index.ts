// Natural date matcher - Main entry point
// Public API: parseSmartDate, stripDateMatch, formatTaskDue

import type { DateMatchPosition, ParsedDate, DateFormat, DateCandidate } from '../types'
import { startOfDay, applyTime } from './date-utils'
import {
    findRelativeDates,
    findWeekdays,
    findMonthDates,
    findNumericDates,
    findOrdinalsOnly,
    type CandidateConsumer,
} from './date-finders'
import {
    collectTimeMatches,
    findAdjacentTime,
    combineDateAndTime,
} from './time-finders'
import { selectBest } from './scorer'

interface ParseOptions {
    dateFormat?: DateFormat
}

function isOptionsBag(value: unknown): value is ParseOptions {
    return (
        value !== null && typeof value === 'object' && !(value instanceof Date)
    )
}

/**
 * Parse natural language date expressions from text
 * @param input - The text to parse
 * @param maybeNow - Optional reference date or options bag
 * @param maybeOptions - Optional options if maybeNow is a Date
 * @returns Parsed date with match position, or null if no date found
 */
export function parseSmartDate(
    input: string,
    maybeNow?: Date | number | string | ParseOptions,
    maybeOptions?: ParseOptions
): ParsedDate | null {
    if (!input || !input.trim()) return null
    let now = new Date()
    let options: ParseOptions = {}

    if (maybeNow instanceof Date) {
        const candidate = new Date(maybeNow)
        if (!Number.isNaN(candidate.getTime())) now = candidate
    } else if (
        typeof maybeNow === 'number' ||
        (typeof maybeNow === 'string' && maybeNow)
    ) {
        const candidate = new Date(maybeNow)
        if (!Number.isNaN(candidate.getTime())) now = candidate
    } else if (isOptionsBag(maybeNow)) {
        options = maybeNow
    }

    if (isOptionsBag(maybeOptions)) {
        options = maybeOptions
    }

    const dateFormat: DateFormat = options.dateFormat === 'dmy' ? 'dmy' : 'mdy'
    const lower = input.toLowerCase()
    const candidates: DateCandidate[] = []
    const consider: CandidateConsumer = (candidate) => {
        if (!candidate || !candidate.date) return
        if (candidate.dateProvided === undefined) {
            candidate.dateProvided = true
        }
        candidates.push(candidate)
    }

    const safeNow = new Date(now)

    findRelativeDates(input, lower, safeNow, consider)
    findWeekdays(input, lower, safeNow, consider)
    findMonthDates(input, lower, safeNow, consider)
    findNumericDates(lower, safeNow, consider, dateFormat)
    findOrdinalsOnly(lower, safeNow, consider)

    const timeDetections = collectTimeMatches(lower)
    const today = startOfDay(safeNow)

    timeDetections.forEach((t) => {
        if (t.requiresDate) return
        const date = applyTime(new Date(today), t.hour, t.minute, t.ampm)
        if (date < safeNow) date.setDate(date.getDate() + 1)
        candidates.push({
            match: { start: t.start, end: t.end },
            date,
            hasTime: true,
            dateProvided: false,
        })
    })

    const withTime = candidates.map((c) => {
        if (c.dateProvided === false) return c
        const t = findAdjacentTime(c, timeDetections, lower)
        if (!t) return c
        if (t.requiresDate && t.start < c.match.end) return c
        return combineDateAndTime(c, t, safeNow)
    })

    const best = selectBest(withTime)
    if (!best || !best.match || !best.date) return null

    // Format the date for return
    const pad = (n: number): string => String(n).padStart(2, '0')
    const y = best.date.getFullYear()
    const m = pad(best.date.getMonth() + 1)
    const d = pad(best.date.getDate())
    let dateStr: string
    if (!best.hasTime) {
        dateStr = `${y}-${m}-${d}`
    } else {
        const h = pad(best.date.getHours())
        const min = pad(best.date.getMinutes())
        const s = pad(best.date.getSeconds())
        dateStr = `${y}-${m}-${d}T${h}:${min}:${s}`
    }

    return {
        match: best.match,
        date: dateStr,
        hasTime: Boolean(best.hasTime),
    }
}

/**
 * Remove the matched date expression from text
 * @param text - The original text
 * @param match - The match position to strip
 * @returns Text with the matched portion removed
 */
export function stripDateMatch(text: string, match: DateMatchPosition | null): string {
    if (!match) return text.trim()
    const before = text.slice(0, match.start).trimEnd()
    const after = text.slice(match.end).trimStart()
    if (!before) return after
    if (!after) return before
    return `${before} ${after}`
}

/**
 * Format a Date object as a due date string
 * @param date - The date to format
 * @param hasTime - Whether to include time in the format
 * @returns Formatted date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 */
export function formatTaskDue(date: Date | null, hasTime: boolean): string | null {
    if (!date) return null
    const pad = (n: number): string => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    if (!hasTime) return `${y}-${m}-${d}`
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${m}-${d}T${h}:${min}:${s}`
}

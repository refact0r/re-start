// Functions that find date expressions in text
// Each finder collects candidate date matches for scoring and selection

import type { DateCandidate, DateFormat } from '../types'
import {
    RELATIVE_DAYS,
    WEEKDAYS,
    MONTHS,
    WEEKDAY_REGEX,
    MONTH_FIRST_PATTERN,
    DAY_FIRST_PATTERN,
} from './constants'
import {
    addDays,
    startOfDay,
    nextWeekday,
    nextWeekend,
    resolveDayToken,
    buildDate,
    parseDayNumber,
} from './date-utils'

/**
 * Consumer function type for processing date candidates
 */
export type CandidateConsumer = (candidate: DateCandidate) => void

/**
 * Finds relative date expressions like "today", "tomorrow", "yesterday"
 */
export function findRelativeDates(_text: string, lower: string, now: Date, consider: CandidateConsumer): void {
    Object.entries(RELATIVE_DAYS).forEach(([word, delta]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'g')
        let m: RegExpExecArray | null
        while ((m = regex.exec(lower))) {
            const date = addDays(startOfDay(now), delta)
            consider({
                match: { start: m.index, end: m.index + word.length },
                date,
                hasTime: false,
                dateProvided: true,
            })
        }
    })
}

/**
 * Resolves "weekend" to the next Saturday or Sunday
 */
export function resolveWeekend(base: Date, isNext: boolean): Date {
    const weekend = nextWeekend(base)
    return isNext ? addDays(weekend, 7) : weekend
}

/**
 * Resolves "weekday" to the next weekday (Monday-Friday)
 */
export function resolveWeekday(base: Date, isNext: boolean): Date {
    const dow = base.getDay()
    if (dow === 0) return addDays(base, 1)
    if (dow === 6) return addDays(base, 2)
    return isNext ? addDays(base, 1) : base
}

/**
 * Finds weekday expressions like "monday", "next friday", "weekend"
 */
export function findWeekdays(_text: string, lower: string, now: Date, consider: CandidateConsumer): void {
    let m: RegExpExecArray | null
    while ((m = WEEKDAY_REGEX.exec(lower))) {
        const modifier = m[1]?.trim()
        const word = m[2]
        const start = m.index
        const end = start + m[0].length
        if (!(word in WEEKDAYS)) continue

        const target = WEEKDAYS[word]
        const base = startOfDay(now)
        const isNext = modifier === 'next'
        let date: Date
        if (word === 'weekend') {
            date = resolveWeekend(base, isNext)
        } else if (word === 'weekday') {
            date = resolveWeekday(base, isNext)
        } else {
            date = nextWeekday(base, target as number, isNext)
        }

        consider({
            match: { start, end },
            date,
            hasTime: false,
            dateProvided: true,
        })
    }
}

/**
 * Finds month-based date expressions like "january 15", "15 march", "jan 1st 2024"
 */
export function findMonthDates(_text: string, lower: string, now: Date, consider: CandidateConsumer): void {
    let m: RegExpExecArray | null
    const monthFirstRegex = new RegExp(MONTH_FIRST_PATTERN, 'gi')
    while ((m = monthFirstRegex.exec(lower))) {
        const [, monthWord, dayToken, yearToken] = m
        pushMonthMatch(m, monthWord, dayToken, yearToken, now, consider, 1)
    }

    const dayFirstRegex = new RegExp(DAY_FIRST_PATTERN, 'gi')
    while ((m = dayFirstRegex.exec(lower))) {
        const [, dayToken, monthWord, yearToken] = m
        pushMonthMatch(m, monthWord, dayToken, yearToken, now, consider)
    }
}

/**
 * Helper function to process a month-based date match and add it to candidates
 */
export function pushMonthMatch(
    match: RegExpExecArray,
    monthWord: string,
    dayToken: string | undefined,
    yearToken: string | undefined,
    now: Date,
    consider: CandidateConsumer,
    defaultDay: number | null = null
): void {
    const month = MONTHS[monthWord]
    if (month === undefined) return
    const day = dayToken ? resolveDayToken(dayToken) : defaultDay
    if (!day) return
    const year = yearToken ? parseInt(yearToken, 10) : undefined
    const date = buildDate(month, day, year, now)

    consider({
        match: { start: match.index, end: match.index + match[0].length },
        date,
        hasTime: false,
        dateProvided: true,
    })
}

/**
 * Finds numeric date expressions like "12/31", "1-15-2024"
 * Respects dateFormat setting (mdy vs dmy)
 */
export function findNumericDates(lower: string, now: Date, consider: CandidateConsumer, dateFormat: DateFormat = 'mdy'): void {
    const regex =
        /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?=[\s,.;!?)\-]|$)/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lower))) {
        const part1 = parseInt(m[1], 10)
        const part2 = parseInt(m[2], 10)
        if (Number.isNaN(part1) || Number.isNaN(part2)) continue
        let month: number
        let day: number
        if (dateFormat === 'dmy') {
            day = part1
            month = part2 - 1
        } else {
            month = part1 - 1
            day = part2
        }
        if (month < 0 || month > 11 || day < 1 || day > 31) continue
        const year = m[3] ? parseInt(m[3], 10) : undefined
        const date = buildDate(month, day, year, now)
        consider({
            match: { start: m.index, end: m.index + m[0].length },
            date,
            hasTime: false,
            dateProvided: true,
        })
    }
}

/**
 * Finds standalone ordinal dates like "15th", "1st"
 * Assumes current or next month depending on day comparison
 */
export function findOrdinalsOnly(lower: string, now: Date, consider: CandidateConsumer): void {
    const regex = /\b(\d{1,2}(?:st|nd|rd|th))\b/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lower))) {
        const day = m[1] === 'first' ? 1 : parseDayNumber(m[1])
        if (!day) continue
        const base = startOfDay(now)
        let date = new Date(base.getFullYear(), base.getMonth(), day)
        if (day <= base.getDate()) {
            date = new Date(base.getFullYear(), base.getMonth() + 1, day)
        }
        consider({
            match: { start: m.index, end: m.index + m[0].length },
            date,
            hasTime: false,
            dateProvided: true,
        })
    }
}

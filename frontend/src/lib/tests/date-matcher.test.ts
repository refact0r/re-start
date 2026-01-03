import { describe, it, expect } from 'vitest'
import { parseSmartDate } from '../date-matcher'
import type { DateFormatPreference } from '../types'

interface DateDue {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
}

interface TestExpected {
    match: string
    hasTime: boolean
    due: DateDue
}

interface TestCase {
    name: string
    input: string
    expected: TestExpected | null
    now?: string
    options?: { dateFormat: DateFormatPreference }
}

const FIXED_NOW = new Date('2025-12-07T12:00:00Z')

const CASES: TestCase[] = [
    {
        name: 'month date only',
        input: 'task dec 12',
        expected: {
            match: 'dec 12',
            hasTime: false,
            due: { year: 2025, month: 12, day: 12 },
        },
    },
    {
        name: 'relative day with time',
        input: 'task tomorrow 10pm',
        expected: {
            match: 'tomorrow 10pm',
            hasTime: true,
            due: { year: 2025, month: 12, day: 8, hour: 22 },
        },
    },
    {
        name: 'relative abbreviation with time',
        input: 'task tmrw 9am',
        expected: {
            match: 'tmrw 9am',
            hasTime: true,
            due: { year: 2025, month: 12, day: 8, hour: 9 },
        },
    },
    {
        name: 'weekday keyword',
        input: 'weekday task',
        expected: {
            match: 'weekday',
            hasTime: false,
            due: { year: 2025, month: 12, day: 8 },
        },
    },
    {
        name: 'next weekday keyword',
        input: 'task next weekday',
        expected: {
            match: 'next weekday',
            hasTime: false,
            due: { year: 2025, month: 12, day: 8 },
        },
    },
    {
        name: 'plain weekday',
        input: 'wed task',
        expected: {
            match: 'wed',
            hasTime: false,
            due: { year: 2025, month: 12, day: 10 },
        },
    },
    {
        name: 'weekend keyword',
        input: 'weekend task',
        expected: {
            match: 'weekend',
            hasTime: false,
            due: { year: 2025, month: 12, day: 13 },
        },
    },
    {
        name: 'next weekend skip week',
        input: 'next weekend task',
        expected: {
            match: 'next weekend',
            hasTime: false,
            due: { year: 2025, month: 12, day: 20 },
        },
    },
    {
        name: 'time before date with short bridge',
        input: '10pm on dec 12 task',
        expected: {
            match: '10pm on dec 12',
            hasTime: true,
            due: { year: 2025, month: 12, day: 12, hour: 22 },
        },
    },
    {
        name: 'time before date simple space bridge',
        input: 'task 10pm dec 12',
        expected: {
            match: '10pm dec 12',
            hasTime: true,
            due: { year: 2025, month: 12, day: 12, hour: 22 },
        },
    },
    {
        name: 'time before date without bridge fails pairing',
        input: '10pm .... dec 12 task',
        expected: {
            match: 'dec 12',
            hasTime: false,
            due: { year: 2025, month: 12, day: 12 },
        },
    },
    {
        name: 'date before time with comma bridge',
        input: 'dec 12, 10pm task',
        expected: {
            match: 'dec 12, 10pm',
            hasTime: true,
            due: { year: 2025, month: 12, day: 12, hour: 22 },
        },
    },
    {
        name: 'date with bare hour via bridge',
        input: 'task dec 12 at 7',
        expected: {
            match: 'dec 12 at 7',
            hasTime: true,
            due: { year: 2025, month: 12, day: 12, hour: 7 },
        },
    },
    {
        name: 'relative day with bare hour',
        input: 'task tomorrow 12',
        expected: {
            match: 'tomorrow 12',
            hasTime: true,
            due: { year: 2025, month: 12, day: 8, hour: 12 },
        },
    },
    {
        name: 'weekday with bare hour',
        input: 'mon 10 task',
        expected: {
            match: 'mon 10',
            hasTime: true,
            due: { year: 2025, month: 12, day: 8, hour: 10 },
        },
    },
    {
        name: 'next weekday with bare hour',
        input: 'task next mon 23',
        expected: {
            match: 'next mon 23',
            hasTime: true,
            due: { year: 2025, month: 12, day: 15, hour: 23 },
        },
    },
    {
        name: 'invalid partial ordinal',
        input: 'task jan 2n',
        expected: {
            match: 'jan',
            hasTime: false,
            due: { year: 2026, month: 1, day: 1 },
        },
    },
    {
        name: 'ordinal only rolls to next month',
        input: 'task 5th',
        expected: {
            match: '5th',
            hasTime: false,
            due: { year: 2026, month: 1, day: 5 },
        },
    },
    {
        name: 'month with ordinal and year',
        input: 'task dec 1st 25',
        expected: {
            match: 'dec 1st 25',
            hasTime: false,
            due: { year: 2025, month: 12, day: 1 },
        },
    },
    {
        name: 'day first month name with year',
        input: 'task 1 dec 2026',
        expected: {
            match: '1 dec 2026',
            hasTime: false,
            due: { year: 2026, month: 12, day: 1 },
        },
    },
    {
        name: 'day first month name without year',
        input: 'task 1 dec',
        expected: {
            match: '1 dec',
            hasTime: false,
            due: { year: 2026, month: 12, day: 1 },
        },
    },
    {
        name: 'numeric date with slash',
        input: 'task 12/15/25',
        expected: {
            match: '12/15/25',
            hasTime: false,
            due: { year: 2025, month: 12, day: 15 },
        },
    },
    {
        name: 'numeric date with dash',
        input: 'task 12-15',
        expected: {
            match: '12-15',
            hasTime: false,
            due: { year: 2025, month: 12, day: 15 },
        },
    },
    {
        name: 'numeric date dashed with year',
        input: 'task 12-15-25',
        expected: {
            match: '12-15-25',
            hasTime: false,
            due: { year: 2025, month: 12, day: 15 },
        },
    },
    {
        name: 'numeric ambiguous defaults to mdy',
        input: 'task 1-12-2026',
        expected: {
            match: '1-12-2026',
            hasTime: false,
            due: { year: 2026, month: 1, day: 12 },
        },
    },
    {
        name: 'numeric date respects dmy format',
        input: 'task 1-12-2026',
        options: { dateFormat: 'dmy' },
        expected: {
            match: '1-12-2026',
            hasTime: false,
            due: { year: 2026, month: 12, day: 1 },
        },
    },
    {
        name: 'time only later today',
        input: 'task 22:10',
        expected: {
            match: '22:10',
            hasTime: true,
            due: { year: 2025, month: 12, day: 7, hour: 22, minute: 10 },
        },
    },
    {
        name: 'time only rolls to tomorrow when past',
        input: 'task 1am',
        expected: {
            match: '1am',
            hasTime: true,
            due: { year: 2025, month: 12, day: 8, hour: 1 },
        },
    },
    {
        name: 'date then comma time',
        input: 'task dec 12, 10pm',
        expected: {
            match: 'dec 12, 10pm',
            hasTime: true,
            due: { year: 2025, month: 12, day: 12, hour: 22 },
        },
    },
    {
        name: 'month name only goes to next occurrence',
        input: 'task jan',
        expected: {
            match: 'jan',
            hasTime: false,
            due: { year: 2026, month: 1, day: 1 },
        },
    },
]

function formatExpectedDate({
    year,
    month,
    day,
    hour,
    minute,
}: DateDue): string {
    const pad = (n: number): string => String(n).padStart(2, '0')
    const dateStr = `${year}-${pad(month)}-${pad(day)}`
    if (hour !== undefined) {
        return `${dateStr}T${pad(hour)}:${pad(minute ?? 0)}:00`
    }
    return dateStr
}

describe('parseSmartDate', () => {
    CASES.forEach((test) => {
        it(test.name, () => {
            const now = test.now ? new Date(test.now) : new Date(FIXED_NOW)
            const result = test.options
                ? parseSmartDate(test.input, now, test.options)
                : parseSmartDate(test.input, now)

            if (test.expected === null) {
                expect(result).toBeNull()
                return
            }

            expect(result).not.toBeNull()
            if (!result) return

            const matchedText = test.input.slice(
                result.match.start,
                result.match.end
            )

            if (test.expected.match) {
                expect(matchedText).toBe(test.expected.match)
            }

            expect(result.date).toBe(formatExpectedDate(test.expected.due))

            if ('hasTime' in test.expected) {
                expect(result.hasTime).toBe(test.expected.hasTime)
            }
        })
    })
})

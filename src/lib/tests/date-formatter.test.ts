import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatRelativeDate } from '../date-matcher/date-formatter'

describe('formatRelativeDate', () => {
    // Use local time for consistent testing across timezones
    const mockNow = new Date(2025, 11, 7, 12, 0, 0) // Dec 7, 2025 at noon local time

    beforeEach(() => {
        vi.setSystemTime(mockNow)
    })

    describe('null date handling', () => {
        it('returns empty string for null date', () => {
            const result = formatRelativeDate(null, false, { timeFormat: '12hr' })
            expect(result).toBe('')
        })

        it('returns empty string for null date with time', () => {
            const result = formatRelativeDate(null, true, { timeFormat: '24hr' })
            expect(result).toBe('')
        })
    })

    describe('relative date formatting', () => {
        it('formats yesterday correctly', () => {
            const yesterday = new Date(2025, 11, 6, 15, 0, 0) // Dec 6, 2025
            const result = formatRelativeDate(yesterday, false, { timeFormat: '12hr' })
            expect(result).toBe('yesterday')
        })

        it('formats today correctly', () => {
            const today = new Date(2025, 11, 7, 15, 0, 0) // Dec 7, 2025
            const result = formatRelativeDate(today, false, { timeFormat: '12hr' })
            expect(result).toBe('today')
        })

        it('formats tomorrow correctly', () => {
            const tomorrow = new Date(2025, 11, 8, 15, 0, 0) // Dec 8, 2025
            const result = formatRelativeDate(tomorrow, false, { timeFormat: '12hr' })
            expect(result).toBe('tmrw')
        })
    })

    describe('weekday abbreviation formatting (2-6 days out)', () => {
        it('formats +2 days as weekday abbreviation', () => {
            const date = new Date(2025, 11, 9, 15, 0, 0) // Dec 9, 2025 - Tuesday
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('tue')
        })

        it('formats +3 days as weekday abbreviation', () => {
            const date = new Date(2025, 11, 10, 15, 0, 0) // Dec 10, 2025 - Wednesday
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('wed')
        })

        it('formats +4 days as weekday abbreviation', () => {
            const date = new Date(2025, 11, 11, 15, 0, 0) // Dec 11, 2025 - Thursday
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('thu')
        })

        it('formats +5 days as weekday abbreviation', () => {
            const date = new Date(2025, 11, 12, 15, 0, 0) // Dec 12, 2025 - Friday
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('fri')
        })

        it('formats +6 days as weekday abbreviation', () => {
            const date = new Date(2025, 11, 13, 15, 0, 0) // Dec 13, 2025 - Saturday
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('sat')
        })
    })

    describe('month/day format (7+ days out)', () => {
        it('formats +7 days as month/day', () => {
            const date = new Date(2025, 11, 14, 15, 0, 0) // Dec 14, 2025
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('dec 14')
        })

        it('formats +30 days as month/day', () => {
            const date = new Date(2026, 0, 6, 15, 0, 0) // Jan 6, 2026
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('jan 6')
        })

        it('formats dates in next year as month/day', () => {
            const date = new Date(2026, 2, 15, 15, 0, 0) // Mar 15, 2026
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('mar 15')
        })
    })

    describe('time formatting in 12hr mode', () => {
        it('appends 12hr time to yesterday', () => {
            const yesterday = new Date(2025, 11, 6, 14, 30, 0) // Dec 6, 2025 at 2:30 PM
            const result = formatRelativeDate(yesterday, true, { timeFormat: '12hr' })
            expect(result).toMatch(/^yesterday \d{1,2}:\d{2}\s?(am|pm)$/i)
        })

        it('appends 12hr time to today', () => {
            const today = new Date(2025, 11, 7, 9, 15, 0) // Dec 7, 2025 at 9:15 AM
            const result = formatRelativeDate(today, true, { timeFormat: '12hr' })
            expect(result).toMatch(/^today \d{1,2}:\d{2}\s?(am|pm)$/i)
        })

        it('appends 12hr time to tomorrow', () => {
            const tomorrow = new Date(2025, 11, 8, 22, 45, 0) // Dec 8, 2025 at 10:45 PM
            const result = formatRelativeDate(tomorrow, true, { timeFormat: '12hr' })
            expect(result).toMatch(/^tmrw \d{1,2}:\d{2}\s?(am|pm)$/i)
        })

        it('appends 12hr time to weekday abbreviation', () => {
            const date = new Date(2025, 11, 9, 15, 30, 0) // Dec 9, 2025 at 3:30 PM
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            expect(result).toMatch(/^tue \d{1,2}:\d{2}\s?(am|pm)$/i)
        })

        it('appends 12hr time to month/day format', () => {
            const date = new Date(2025, 11, 14, 18, 0, 0) // Dec 14, 2025 at 6:00 PM
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            expect(result).toMatch(/^dec 14 \d{1,2}:\d{2}\s?(am|pm)$/i)
        })

        it('formats morning time correctly', () => {
            const date = new Date(2025, 11, 7, 8, 30, 0) // Dec 7, 2025 at 8:30 AM
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            // Should contain am and not pm
            expect(result).toMatch(/am/i)
            expect(result).not.toMatch(/pm/i)
        })

        it('formats afternoon time correctly', () => {
            const date = new Date(2025, 11, 7, 15, 30, 0) // Dec 7, 2025 at 3:30 PM
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            // Should contain pm and not am
            expect(result).toMatch(/pm/i)
            expect(result).not.toMatch(/am/i)
        })

        it('formats midnight correctly', () => {
            const date = new Date(2025, 11, 7, 0, 0, 0) // Dec 7, 2025 at midnight
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            expect(result).toMatch(/12:00\s?am/i)
        })

        it('formats noon correctly', () => {
            const date = new Date(2025, 11, 7, 12, 0, 0) // Dec 7, 2025 at noon
            const result = formatRelativeDate(date, true, { timeFormat: '12hr' })
            expect(result).toMatch(/12:00\s?pm/i)
        })
    })

    describe('time formatting in 24hr mode', () => {
        it('appends 24hr time to yesterday', () => {
            const yesterday = new Date(2025, 11, 6, 14, 30, 0) // Dec 6, 2025 at 14:30
            const result = formatRelativeDate(yesterday, true, { timeFormat: '24hr' })
            expect(result).toMatch(/^yesterday \d{1,2}:\d{2}$/)
            expect(result).not.toMatch(/am|pm/i)
        })

        it('appends 24hr time to today', () => {
            const today = new Date(2025, 11, 7, 9, 15, 0) // Dec 7, 2025 at 9:15
            const result = formatRelativeDate(today, true, { timeFormat: '24hr' })
            expect(result).toMatch(/^today \d{1,2}:\d{2}$/)
            expect(result).not.toMatch(/am|pm/i)
        })

        it('appends 24hr time to tomorrow', () => {
            const tomorrow = new Date(2025, 11, 8, 22, 45, 0) // Dec 8, 2025 at 22:45
            const result = formatRelativeDate(tomorrow, true, { timeFormat: '24hr' })
            expect(result).toMatch(/^tmrw \d{1,2}:\d{2}$/)
            expect(result).not.toMatch(/am|pm/i)
        })

        it('appends 24hr time to weekday abbreviation', () => {
            const date = new Date(2025, 11, 9, 15, 30, 0) // Dec 9, 2025 at 15:30
            const result = formatRelativeDate(date, true, { timeFormat: '24hr' })
            expect(result).toMatch(/^tue \d{1,2}:\d{2}$/)
            expect(result).not.toMatch(/am|pm/i)
        })

        it('appends 24hr time to month/day format', () => {
            const date = new Date(2025, 11, 14, 18, 0, 0) // Dec 14, 2025 at 18:00
            const result = formatRelativeDate(date, true, { timeFormat: '24hr' })
            expect(result).toMatch(/^dec 14 \d{1,2}:\d{2}$/)
            expect(result).not.toMatch(/am|pm/i)
        })

        it('formats midnight correctly', () => {
            const date = new Date(2025, 11, 7, 0, 0, 0) // Dec 7, 2025 at midnight
            const result = formatRelativeDate(date, true, { timeFormat: '24hr' })
            expect(result).toMatch(/0:00/)
        })

        it('formats afternoon hours correctly', () => {
            const date = new Date(2025, 11, 7, 15, 30, 0) // Dec 7, 2025 at 15:30
            const result = formatRelativeDate(date, true, { timeFormat: '24hr' })
            expect(result).toMatch(/15:30/)
        })
    })

    describe('edge cases', () => {
        it('handles dates without time correctly', () => {
            const date = new Date(2025, 11, 10, 15, 30, 0) // Dec 10, 2025
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).not.toMatch(/am|pm|\d{1,2}:\d{2}/i)
        })

        it('formats distant past dates correctly', () => {
            const date = new Date(2025, 10, 1, 15, 0, 0) // Nov 1, 2025 - More than a week ago
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('nov 1')
        })

        it('handles day boundaries correctly for yesterday', () => {
            const date = new Date(2025, 11, 6, 23, 59, 59) // Dec 6, 2025 at 23:59:59
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('yesterday')
        })

        it('handles day boundaries correctly for today', () => {
            const date = new Date(2025, 11, 7, 0, 0, 0) // Dec 7, 2025 at 00:00:00
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('today')
        })

        it('handles day boundaries correctly for tomorrow', () => {
            const date = new Date(2025, 11, 8, 0, 0, 0) // Dec 8, 2025 at 00:00:00
            const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
            expect(result).toBe('tmrw')
        })

        it('uses lowercase for all outputs', () => {
            const testCases = [
                new Date(2025, 11, 6, 15, 0, 0), // yesterday
                new Date(2025, 11, 7, 15, 0, 0), // today
                new Date(2025, 11, 8, 15, 0, 0), // tmrw
                new Date(2025, 11, 9, 15, 0, 0), // tue
                new Date(2025, 11, 14, 15, 0, 0), // dec 14
            ]

            testCases.forEach((date) => {
                const result = formatRelativeDate(date, false, { timeFormat: '12hr' })
                expect(result).toBe(result.toLowerCase())
            })
        })

        it('preserves time precision across different date formats', () => {
            const testTime = new Date(2025, 11, 10, 14, 23, 0) // Dec 10, 2025 at 14:23

            const result12hr = formatRelativeDate(testTime, true, { timeFormat: '12hr' })
            const result24hr = formatRelativeDate(testTime, true, { timeFormat: '24hr' })

            // Both should include minutes
            expect(result12hr).toMatch(/:\d{2}/)
            expect(result24hr).toMatch(/:\d{2}/)
        })
    })
})

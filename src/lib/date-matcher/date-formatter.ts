// Date formatting utilities for displaying relative dates
// Formats dates as 'yesterday', 'today', 'tmrw', weekday abbreviations, or 'mon dd' format

import { startOfDay } from './date-utils'
import type { FormatOptions } from '../types'

/**
 * Formats a date as relative text or calendar format
 *
 * Returns:
 * - 'yesterday' for -1 days
 * - 'today' for current day
 * - 'tmrw' for +1 day
 * - Lowercase weekday abbreviation (e.g., 'mon', 'tue') for +2 to +6 days
 * - Lowercase month + day (e.g., 'jan 15') for dates 7+ days out
 * - Appends time in 12hr or 24hr format when hasTime is true
 *
 * @param date - The date to format (null returns empty string)
 * @param hasTime - Whether to append time to the formatted string
 * @param options - Formatting options including timeFormat ('12hr' | '24hr')
 * @returns Formatted date string
 */
export function formatRelativeDate(
    date: Date | null,
    hasTime: boolean,
    options: FormatOptions
): string {
    if (!date) return ''

    const now = new Date()
    const today = startOfDay(now)
    const dueDate = new Date(date)
    const dueDateOnly = startOfDay(dueDate)

    const diffTime = dueDateOnly.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let dateString = ''

    if (diffDays === -1) {
        dateString = 'yesterday'
    } else if (diffDays === 0) {
        dateString = 'today'
    } else if (diffDays === 1) {
        dateString = 'tmrw'
    } else if (diffDays > 1 && diffDays < 7) {
        dateString = dueDate
            .toLocaleDateString('en-US', { weekday: 'short' })
            .toLowerCase()
    } else {
        dateString = dueDate
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            .toLowerCase()
    }

    if (hasTime) {
        let timeString
        if (options.timeFormat === '12hr') {
            timeString = dueDate
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })
                .toLowerCase()
        } else {
            timeString = dueDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: false,
            })
        }
        dateString += ` ${timeString}`
    }

    return dateString
}

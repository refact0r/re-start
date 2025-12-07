// Natural date matcher for task input
// Returns matched span + normalized Date for scheduling/highlighting.

const MONTHS = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
}

const WEEKDAYS = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
    weekend: 6, // handled separately
    weekday: 'weekday', // handled separately
}

const RELATIVE_DAYS = {
    tomorrow: 1,
    tmrw: 1,
    tmr: 1,
    yesterday: -1,
    today: 0,
}

const WORD_NUMBERS = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function normalizeYear(year, nowYear) {
    if (!year && year !== 0) return nowYear
    if (year < 100) return 2000 + year
    return year
}

function nextWeekend(base) {
    const dow = base.getDay()
    if (dow === 6) return addDays(base, 1) // Saturday -> Sunday
    const offset = (6 - dow + 7) % 7 || 7 // Next Saturday
    return addDays(base, offset)
}

function addDays(date, days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

function firstWeekdayNextMonth(base, targetDow) {
    const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1)
    const offset = (targetDow - nextMonth.getDay() + 7) % 7
    return addDays(nextMonth, offset)
}

function nextWeekday(base, targetDow, isNextModifier = false) {
    const offsetRaw = (targetDow - base.getDay() + 7) % 7
    const offset = offsetRaw === 0 || isNextModifier ? offsetRaw + 7 : offsetRaw
    return addDays(base, offset)
}

function parseDayNumber(raw) {
    if (!raw) return null
    const cleaned = raw.replace(/(st|nd|rd|th)$/i, '')
    const num = parseInt(cleaned, 10)
    if (Number.isNaN(num) || num < 1 || num > 31) return null
    return num
}

function clampFuture(date, now) {
    if (date.getTime() >= startOfDay(now).getTime()) return date
    const bumped = new Date(date)
    bumped.setFullYear(date.getFullYear() + 1)
    return bumped
}

function buildDate(month, day, year, now) {
    const y = normalizeYear(year, now.getFullYear())
    const targetDay = day || 1
    let candidate = new Date(y, month, targetDay)
    if (year === undefined) {
        candidate = clampFuture(candidate, now)
    }
    return candidate
}

function applyTime(date, hour, minute, ampmProvided) {
    const result = new Date(date)
    let h = hour
    let m = minute ?? 0

    if (ampmProvided === 'am' || ampmProvided === 'a') {
        if (h === 12) h = 0
    } else if (ampmProvided === 'pm' || ampmProvided === 'p') {
        if (h < 12) h += 12
    } else {
        // No explicit am/pm, favor morning; 12 defaults to 12pm per spec
        if (h === 12) {
            h = 12
        } else if (h <= 12) {
            // keep as-is (morning)
        }
    }

    result.setHours(h, m, 0, 0)
    return result
}

function buildDueResult(candidate) {
    if (!candidate || !candidate.match || !candidate.date) return null
    const { match, date, hasTime } = candidate
    return {
        match,
        date,
        hasTime: Boolean(hasTime),
    }
}

function findRelativeDates(text, lower, now, consider) {
    Object.entries(RELATIVE_DAYS).forEach(([word, delta]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'g')
        let m
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

function findWeekdays(text, lower, now, consider) {
    const regex =
        /(next|first)?\s*\b(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(r|rs|rsday)?|fri(day)?|sat(urday)?|weekend|weekday)\b/gi
    let m
    while ((m = regex.exec(lower))) {
        const modifier = m[1]?.trim()
        const word = m[2]
        const start = m.index
        const end = start + m[0].length
        if (!(word in WEEKDAYS)) continue

        const target = WEEKDAYS[word]
        let date
        if (word === 'weekend') {
            date = nextWeekend(startOfDay(now))
            if (modifier === 'next') {
                date = addDays(date, 7)
            }
        } else if (word === 'weekday') {
            const base = startOfDay(now)
            const dow = base.getDay()
            const isNext = modifier === 'next'
            let offset = 0
            if (dow === 0) offset = 1 // Sunday -> Monday
            else if (dow === 6) offset = 2 // Saturday -> Monday
            else if (isNext) offset = 1 // already weekday, move to next weekday
            date = addDays(base, offset)
        } else if (modifier === 'first') {
            date = firstWeekdayNextMonth(now, target)
        } else {
            const isNext = modifier === 'next'
            date = nextWeekday(startOfDay(now), target, isNext)
        }

        consider({
            match: { start, end },
            date,
            hasTime: false,
            dateProvided: true,
        })
    }
}

function findMonthDates(text, lower, now, consider) {
    const monthNames = Object.keys(MONTHS).join('|')
    const trailing = '(?=[\\s,.;!?)-]|$)'
    const regex = new RegExp(
        `\\b(${monthNames})\\b\\s*(?:([0-3]?\\d(?:st|nd|rd|th)?|first))?(?:\\s*,?\\s*(\\d{2,4}))?${trailing}`,
        'gi'
    )
    let m
    while ((m = regex.exec(lower))) {
        const [, monthWord, dayRaw, yearRaw] = m
        const month = MONTHS[monthWord]
        const day = dayRaw ? parseDayNumber(dayRaw) : 1
        if (!month && month !== 0) continue
        if (!day) continue

        const year = yearRaw ? parseInt(yearRaw, 10) : undefined
        const date = buildDate(month, day, year, now)
        consider({
            match: { start: m.index, end: m.index + m[0].length },
            date,
            hasTime: false,
            dateProvided: true,
        })
    }
}

function findNumericDates(lower, now, consider) {
    const regex =
        /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?=[\s,.;!?)\-]|$)/g
    let m
    while ((m = regex.exec(lower))) {
        const month = parseInt(m[1], 10) - 1
        const day = parseInt(m[2], 10)
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

function findOrdinalsOnly(lower, now, consider) {
    const regex = /\b(\d{1,2}(?:st|nd|rd|th))\b/g
    let m
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

function findTimeWithAmPm(lower, considerTime) {
    const regex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)\b/g
    let m
    while ((m = regex.exec(lower))) {
        const hour = parseInt(m[1], 10)
        const minute = m[2] ? parseInt(m[2], 10) : 0
        if (hour > 24 || minute > 59) continue
        considerTime({
            start: m.index,
            end: m.index + m[0].length,
            hour,
            minute,
            ampm: m[3],
        })
    }
}

function findSpelledTime(lower, considerTime) {
    const regex = new RegExp(
        `\\b(${Object.keys(WORD_NUMBERS).join('|')})\\s*(am|pm|a|p)\\b`,
        'g'
    )
    let m
    while ((m = regex.exec(lower))) {
        const hour = WORD_NUMBERS[m[1]]
        considerTime({
            start: m.index,
            end: m.index + m[0].length,
            hour,
            minute: 0,
            ampm: m[2],
        })
    }
}

function findTime24h(lower, considerTime) {
    const regex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g
    let m
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

function findBareHours(lower, considerTime) {
    const regex = /\b([0-2]?\d)\b/g
    let m
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

function combineDateAndTime(candidate, time, now) {
    if (!time) return candidate

    const hasTime = true
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
        hasTime,
        dateProvided: true,
    }
}

function isBridgeable(segment) {
    if (segment == null) return false
    if (!segment.includes(' ')) return false
    return segment.length <= 4
}

function findAdjacentTime(candidate, times, lower) {
    if (!times.length) return null
    let bestAfter = null
    for (const time of times) {
        if (time.start < candidate.match.end) continue
        const bridge = lower.slice(candidate.match.end, time.start)
        if (!isBridgeable(bridge)) continue
        if (!bestAfter || time.start < bestAfter.start) {
            bestAfter = time
        }
    }
    if (bestAfter) return bestAfter

    let bestBefore = null
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

function candidatePriority(candidate) {
    if (candidate.dateProvided === false) return 0
    if (candidate.hasTime) return 2
    return 1
}

function selectBest(candidates) {
    return candidates.reduce((best, curr) => {
        if (!best) return curr
        const currPriority = candidatePriority(curr)
        const bestPriority = candidatePriority(best)
        if (currPriority !== bestPriority) {
            return currPriority > bestPriority ? curr : best
        }
        const currLen = curr.match.end - curr.match.start
        const bestLen = best.match.end - best.match.start
        if (currLen !== bestLen) {
            return currLen > bestLen ? curr : best
        }
        if (curr.match.start !== best.match.start) {
            return curr.match.start > best.match.start ? curr : best
        }
        return curr
    }, null)
}

export function parseSmartDate(input, now = new Date()) {
    if (!input || !input.trim()) return null
    const lower = input.toLowerCase()
    const candidates = []
    const consider = (candidate) => {
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
    findNumericDates(lower, safeNow, consider)
    findOrdinalsOnly(lower, safeNow, consider)

    const timeDetections = []
    const collectTime = (t) => timeDetections.push(t)
    findTimeWithAmPm(lower, collectTime)
    findSpelledTime(lower, collectTime)
    findTime24h(lower, collectTime)
    findBareHours(lower, collectTime)

    timeDetections.forEach((t) => {
        if (t.requiresDate) return
        const today = startOfDay(safeNow)
        const date = applyTime(today, t.hour, t.minute, t.ampm)
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
    return buildDueResult(best)
}

export function stripDateMatch(text, match) {
    if (!match) return text.trim()
    const before = text.slice(0, match.start)
    const after = text.slice(match.end)
    return `${before} ${after}`
        .replace(/\s+/g, ' ')
        .replace(/\s+,/g, ',')
        .trim()
}

export function formatTodoistDue(date, hasTime) {
    if (!date) return null
    const pad = (n) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    if (!hasTime) return `${y}-${m}-${d}`
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${m}-${d}T${h}:${min}:${s}`
}

// Example phrases covered:
// - "tomorrow", "tmrw", "tmr"
// - "next mon", "first mon", "weekend"
// - "dec 12", "dec 1st 25", "december", "12/1/2025", "12-1-25"
// - "mon 10", "10pm", "10:02", "ten pm"

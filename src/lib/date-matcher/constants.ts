// Natural date matcher constants
// Month names, weekdays, relative days, and regex patterns

export const MONTHS: Record<string, number> = {
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

export const WEEKDAYS: Record<string, number | string> = {
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

export const RELATIVE_DAYS: Record<string, number> = {
    tomorrow: 1,
    tmrw: 1,
    tmr: 1,
    yesterday: -1,
    today: 0,
}

export const MONTH_NAME_PATTERN = Object.keys(MONTHS).join('|')
export const WEEKDAY_PATTERN = Object.keys(WEEKDAYS).join('|')
export const DAY_TOKEN_PATTERN = '(\\d{1,2}(?:st|nd|rd|th)?|first)'
export const YEAR_TOKEN_PATTERN = '(\\d{2,4})'
export const TRAILING_BOUNDARY = '(?=[\\s,.;!?)-]|$)'
export const MONTH_FIRST_PATTERN = `\\b(${MONTH_NAME_PATTERN})\\b(?:\\s+${DAY_TOKEN_PATTERN})?(?:\\s*,?\\s*${YEAR_TOKEN_PATTERN})?${TRAILING_BOUNDARY}`
export const DAY_FIRST_PATTERN = `\\b${DAY_TOKEN_PATTERN}\\s+(${MONTH_NAME_PATTERN})\\b(?:\\s*,?\\s*${YEAR_TOKEN_PATTERN})?${TRAILING_BOUNDARY}`
export const WEEKDAY_REGEX = new RegExp(`(next)?\\s*\\b(${WEEKDAY_PATTERN})\\b`, 'gi')

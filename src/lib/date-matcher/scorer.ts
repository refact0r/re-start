// Scoring and selection logic for date candidates

import type { DateCandidate } from '../types'

/**
 * Calculate a score for a date candidate based on:
 * - Type weight (time > date > no-date-provided)
 * - Match span length (longer is better)
 * - Match position (earlier in text is better)
 */
export function scoreCandidate(candidate: DateCandidate): number {
    const typeWeight =
        candidate.dateProvided === false ? 1 : candidate.hasTime ? 3 : 2
    const span = candidate.match.end - candidate.match.start
    const position = candidate.match.start
    return typeWeight * 1_000_000 + span * 1_000 + position
}

/**
 * Select the best candidate from an array using the scoring function.
 * Returns null if the array is empty.
 */
export function selectBest(candidates: DateCandidate[]): DateCandidate | null {
    return candidates.reduce<DateCandidate | null>((best, curr) => {
        if (!best) return curr
        return scoreCandidate(curr) >= scoreCandidate(best) ? curr : best
    }, null)
}

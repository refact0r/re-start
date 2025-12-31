import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateUUID } from '../uuid'

describe('generateUUID', () => {
    it('generates a valid UUID v4 format', () => {
        const uuid = generateUUID()
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        // where y is one of [8, 9, a, b]
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(uuid).toMatch(uuidV4Regex)
    })

    it('generates unique UUIDs', () => {
        const uuids = new Set<string>()
        const iterations = 1000

        for (let i = 0; i < iterations; i++) {
            uuids.add(generateUUID())
        }

        // All UUIDs should be unique
        expect(uuids.size).toBe(iterations)
    })

    it('generates strings of correct length', () => {
        const uuid = generateUUID()
        // UUID format is always 36 characters (32 hex + 4 hyphens)
        expect(uuid).toHaveLength(36)
    })

    it('has correct hyphen positions', () => {
        const uuid = generateUUID()
        // Hyphens should be at positions 8, 13, 18, 23
        expect(uuid[8]).toBe('-')
        expect(uuid[13]).toBe('-')
        expect(uuid[18]).toBe('-')
        expect(uuid[23]).toBe('-')
    })

    it('has version 4 indicator', () => {
        const uuid = generateUUID()
        // Character at position 14 should be '4'
        expect(uuid[14]).toBe('4')
    })

    it('has correct variant bits', () => {
        const uuid = generateUUID()
        // Character at position 19 should be one of [8, 9, a, b]
        const variantChar = uuid[19].toLowerCase()
        expect(['8', '9', 'a', 'b']).toContain(variantChar)
    })

    describe('fallback implementation', () => {
        let originalRandomUUID: typeof crypto.randomUUID | undefined

        beforeEach(() => {
            // Save original randomUUID
            originalRandomUUID = globalThis.crypto?.randomUUID
        })

        afterEach(() => {
            // Restore original randomUUID
            if (originalRandomUUID) {
                vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: originalRandomUUID })
            }
            vi.unstubAllGlobals()
        })

        it('works when crypto.randomUUID is unavailable', () => {
            // Stub crypto without randomUUID
            vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined })

            const uuid = generateUUID()
            const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            expect(uuid).toMatch(uuidV4Regex)
        })

        it('fallback generates unique UUIDs', () => {
            // Stub crypto without randomUUID
            vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined })

            const uuids = new Set<string>()
            const iterations = 100

            for (let i = 0; i < iterations; i++) {
                uuids.add(generateUUID())
            }

            // All UUIDs should be unique
            expect(uuids.size).toBe(iterations)
        })
    })
})

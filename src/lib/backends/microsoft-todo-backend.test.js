import { describe, it, expect } from 'vitest'
import MicrosoftTodoBackend, {
    mapMicrosoftTask,
    normalizeDueForGraph,
} from './microsoft-todo-backend.js'

describe('microsoft todo backend helpers', () => {
    it('maps date-only dueDateTime as no-time task', () => {
        const mapped = mapMicrosoftTask(
            {
                id: '1',
                title: 'pay bill',
                status: 'notStarted',
                dueDateTime: {
                    dateTime: '2026-03-20T00:00:00',
                    timeZone: 'UTC',
                },
            },
            'Personal',
            7
        )

        expect(mapped.has_time).toBe(false)
        expect(mapped.due?.date).toBe('2026-03-20')
        expect(mapped.due_date?.getFullYear()).toBe(2026)
        expect(mapped.due_date?.getMonth()).toBe(2)
        expect(mapped.due_date?.getDate()).toBe(20)
        expect(mapped.due_date?.getHours()).toBe(23)
        expect(mapped.project_name).toBe('Personal')
        expect(mapped.child_order).toBe(7)
    })

    it('normalizes due for graph date and datetime formats', () => {
        expect(normalizeDueForGraph('2026-03-20')).toEqual({
            dateTime: '2026-03-20T00:00:00',
            timeZone: 'UTC',
        })

        const normalized = normalizeDueForGraph('2026-03-20T09:30:00')
        expect(normalized?.timeZone).toBe('UTC')
        expect(normalized?.dateTime).toMatch(/^2026-03-20T\d{2}:30:00$/)
    })

    it('sorts unchecked first, then by due date', () => {
        const sorted = MicrosoftTodoBackend.sortTasks([
            {
                id: 'a',
                checked: false,
                due_date: new Date('2026-03-10T23:59:59'),
                child_order: 2,
            },
            {
                id: 'b',
                checked: true,
                completed_at: '2026-03-09T08:00:00Z',
                due_date: null,
                child_order: 1,
            },
            {
                id: 'c',
                checked: false,
                due_date: new Date('2026-03-08T23:59:59'),
                child_order: 3,
            },
        ])

        expect(sorted.map((task) => task.id)).toEqual(['c', 'a', 'b'])
    })
})

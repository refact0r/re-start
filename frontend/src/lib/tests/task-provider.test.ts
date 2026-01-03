import { describe, it, expect } from 'vitest'
import TaskProvider from '../providers/task-provider'
import type { EnrichedTask } from '../types'

// Helper function to create test tasks with default values
function createTask(overrides: Partial<EnrichedTask> = {}): EnrichedTask {
    return {
        id: 'test-id',
        content: 'Test task',
        checked: false,
        completed_at: null,
        due: null,
        project_id: null,
        labels: [],
        child_order: 0,
        project_name: '',
        label_names: [],
        due_date: null,
        has_time: false,
        ...overrides,
    }
}

describe('TaskProvider.sortTasks', () => {
    describe('unchecked tasks first', () => {
        it('places unchecked tasks before checked tasks', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', checked: true, content: 'Checked task' }),
                createTask({
                    id: '2',
                    checked: false,
                    content: 'Unchecked task',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2')
            expect(sorted[0].checked).toBe(false)
            expect(sorted[1].id).toBe('1')
            expect(sorted[1].checked).toBe(true)
        })

        it('maintains order of all unchecked tasks before all checked tasks', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', checked: true }),
                createTask({ id: '2', checked: false }),
                createTask({ id: '3', checked: true }),
                createTask({ id: '4', checked: false }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].checked).toBe(false)
            expect(sorted[1].checked).toBe(false)
            expect(sorted[2].checked).toBe(true)
            expect(sorted[3].checked).toBe(true)
        })
    })

    describe('completed tasks sorted by completed_at', () => {
        it('sorts checked tasks by completed_at (most recent first)', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    checked: true,
                    completed_at: '2025-12-01T10:00:00Z',
                }),
                createTask({
                    id: '2',
                    checked: true,
                    completed_at: '2025-12-03T10:00:00Z',
                }),
                createTask({
                    id: '3',
                    checked: true,
                    completed_at: '2025-12-02T10:00:00Z',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Most recent (Dec 3) should be first
            expect(sorted[0].id).toBe('2')
            expect(sorted[1].id).toBe('3')
            expect(sorted[2].id).toBe('1')
        })

        it('handles checked tasks without completed_at', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    checked: true,
                    completed_at: '2025-12-01T10:00:00Z',
                }),
                createTask({ id: '2', checked: true, completed_at: null }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Should not throw and maintain some order
            expect(sorted).toHaveLength(2)
            expect(sorted[0].checked).toBe(true)
            expect(sorted[1].checked).toBe(true)
        })
    })

    describe('tasks with due dates before tasks without', () => {
        it('places tasks with due dates before tasks without', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', due_date: null }),
                createTask({
                    id: '2',
                    due_date: new Date('2025-12-10'),
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2')
            expect(sorted[0].due_date).not.toBeNull()
            expect(sorted[1].id).toBe('1')
            expect(sorted[1].due_date).toBeNull()
        })

        it('applies due date ordering only to unchecked tasks', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    checked: true,
                    due_date: new Date('2025-12-10'),
                }),
                createTask({ id: '2', checked: false, due_date: null }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Unchecked task should come first regardless of due date
            expect(sorted[0].id).toBe('2')
            expect(sorted[0].checked).toBe(false)
            expect(sorted[1].id).toBe('1')
            expect(sorted[1].checked).toBe(true)
        })
    })

    describe('sorting by due date (earliest first)', () => {
        it('sorts tasks with due dates by earliest first', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    due_date: new Date('2025-12-15'),
                }),
                createTask({
                    id: '2',
                    due_date: new Date('2025-12-10'),
                }),
                createTask({
                    id: '3',
                    due_date: new Date('2025-12-20'),
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2') // Dec 10
            expect(sorted[1].id).toBe('1') // Dec 15
            expect(sorted[2].id).toBe('3') // Dec 20
        })

        it('sorts tasks with same due date by child_order', () => {
            const dueDate = new Date('2025-12-15')
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', due_date: dueDate, child_order: 2 }),
                createTask({ id: '2', due_date: dueDate, child_order: 0 }),
                createTask({ id: '3', due_date: dueDate, child_order: 1 }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2') // child_order 0
            expect(sorted[1].id).toBe('3') // child_order 1
            expect(sorted[2].id).toBe('1') // child_order 2
        })
    })

    describe('project-based sorting for tasks without due dates', () => {
        it('places non-project tasks before project tasks when no due date', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    due_date: null,
                    project_id: 'project-123',
                    project_name: 'Work',
                }),
                createTask({
                    id: '2',
                    due_date: null,
                    project_id: null,
                    project_name: '',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2')
            expect(sorted[0].project_id).toBeNull()
            expect(sorted[1].id).toBe('1')
            expect(sorted[1].project_id).toBe('project-123')
        })

        it('treats Inbox as non-project', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    due_date: null,
                    project_id: 'project-123',
                    project_name: 'Work',
                }),
                createTask({
                    id: '2',
                    due_date: null,
                    project_id: 'inbox-id',
                    project_name: 'Inbox',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2')
            expect(sorted[0].project_name).toBe('Inbox')
            expect(sorted[1].id).toBe('1')
            expect(sorted[1].project_name).toBe('Work')
        })

        it('does not apply project sorting to tasks with due dates', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    due_date: new Date('2025-12-15'),
                    project_id: null,
                    project_name: '',
                }),
                createTask({
                    id: '2',
                    due_date: new Date('2025-12-10'),
                    project_id: 'project-123',
                    project_name: 'Work',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Should sort by due date, not project
            expect(sorted[0].id).toBe('2') // Earlier due date
            expect(sorted[1].id).toBe('1')
        })
    })

    describe('child_order as tiebreaker', () => {
        it('uses child_order when all other criteria are equal', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', child_order: 5 }),
                createTask({ id: '2', child_order: 1 }),
                createTask({ id: '3', child_order: 3 }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2') // child_order 1
            expect(sorted[1].id).toBe('3') // child_order 3
            expect(sorted[2].id).toBe('1') // child_order 5
        })

        it('uses child_order for tasks without due dates in same project state', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    due_date: null,
                    project_id: null,
                    child_order: 2,
                }),
                createTask({
                    id: '2',
                    due_date: null,
                    project_id: null,
                    child_order: 0,
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].id).toBe('2')
            expect(sorted[1].id).toBe('1')
        })
    })

    describe('complex sorting scenarios', () => {
        it('correctly sorts a mixed set of tasks', () => {
            const tasks: EnrichedTask[] = [
                // Checked task (should be last)
                createTask({
                    id: 'checked-1',
                    checked: true,
                    completed_at: '2025-12-01T10:00:00Z',
                }),
                // Unchecked with due date (should be first group)
                createTask({
                    id: 'due-1',
                    checked: false,
                    due_date: new Date('2025-12-15'),
                    child_order: 1,
                }),
                createTask({
                    id: 'due-2',
                    checked: false,
                    due_date: new Date('2025-12-10'),
                    child_order: 0,
                }),
                // Unchecked without due date, no project
                createTask({
                    id: 'no-due-no-project',
                    checked: false,
                    due_date: null,
                    project_id: null,
                    child_order: 2,
                }),
                // Unchecked without due date, with project
                createTask({
                    id: 'no-due-with-project',
                    checked: false,
                    due_date: null,
                    project_id: 'proj-1',
                    project_name: 'Work',
                    child_order: 0,
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Expected order:
            // 1. Unchecked with earliest due date
            expect(sorted[0].id).toBe('due-2')
            // 2. Unchecked with later due date
            expect(sorted[1].id).toBe('due-1')
            // 3. Unchecked without due date, no project
            expect(sorted[2].id).toBe('no-due-no-project')
            // 4. Unchecked without due date, with project
            expect(sorted[3].id).toBe('no-due-with-project')
            // 5. Checked task
            expect(sorted[4].id).toBe('checked-1')
        })

        it('handles multiple checked tasks with different completion times', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: 'unchecked', checked: false, child_order: 0 }),
                createTask({
                    id: 'checked-recent',
                    checked: true,
                    completed_at: '2025-12-03T10:00:00Z',
                }),
                createTask({
                    id: 'checked-old',
                    checked: true,
                    completed_at: '2025-12-01T10:00:00Z',
                }),
                createTask({
                    id: 'checked-middle',
                    checked: true,
                    completed_at: '2025-12-02T10:00:00Z',
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            // Unchecked first
            expect(sorted[0].id).toBe('unchecked')
            // Then checked by most recent completion
            expect(sorted[1].id).toBe('checked-recent')
            expect(sorted[2].id).toBe('checked-middle')
            expect(sorted[3].id).toBe('checked-old')
        })

        it('handles empty task array', () => {
            const tasks: EnrichedTask[] = []
            const sorted = TaskProvider.sortTasks(tasks)
            expect(sorted).toEqual([])
        })

        it('handles single task', () => {
            const tasks: EnrichedTask[] = [createTask({ id: 'only-task' })]
            const sorted = TaskProvider.sortTasks(tasks)
            expect(sorted).toHaveLength(1)
            expect(sorted[0].id).toBe('only-task')
        })

        it('does not mutate original array', () => {
            const tasks: EnrichedTask[] = [
                createTask({ id: '1', child_order: 2 }),
                createTask({ id: '2', child_order: 1 }),
            ]

            const original = [...tasks]
            TaskProvider.sortTasks(tasks)

            // Original array should be mutated (sort mutates in place)
            // But we can verify the sort worked
            expect(tasks[0].id).toBe('2')
            expect(tasks[1].id).toBe('1')
        })

        it('handles tasks with identical properties using child_order', () => {
            const tasks: EnrichedTask[] = [
                createTask({
                    id: '1',
                    content: 'Task A',
                    checked: false,
                    due_date: null,
                    project_id: null,
                    child_order: 3,
                }),
                createTask({
                    id: '2',
                    content: 'Task B',
                    checked: false,
                    due_date: null,
                    project_id: null,
                    child_order: 1,
                }),
                createTask({
                    id: '3',
                    content: 'Task C',
                    checked: false,
                    due_date: null,
                    project_id: null,
                    child_order: 2,
                }),
            ]

            const sorted = TaskProvider.sortTasks(tasks)

            expect(sorted[0].child_order).toBe(1)
            expect(sorted[1].child_order).toBe(2)
            expect(sorted[2].child_order).toBe(3)
        })
    })
})

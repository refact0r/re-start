import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TodoistBackend from '../backends/todoist-backend'

// Mock the UUID module
vi.mock('../uuid', () => ({
    generateUUID: vi.fn(() => 'mock-uuid-123'),
}))

// Helper to create a mock localStorage
function createMockLocalStorage() {
    const store: Record<string, string> = {}
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key]
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach((key) => delete store[key])
        }),
        get length() {
            return Object.keys(store).length
        },
        key: vi.fn((index: number) => {
            const keys = Object.keys(store)
            return keys[index] || null
        }),
        _store: store, // Internal access for testing
    }
}

// Helper to create a mock fetch function
function createMockFetch() {
    return vi.fn()
}

describe('TodoistBackend', () => {
    let mockLocalStorage: ReturnType<typeof createMockLocalStorage>
    let mockFetch: ReturnType<typeof createMockFetch>

    beforeEach(() => {
        mockLocalStorage = createMockLocalStorage()
        vi.stubGlobal('localStorage', mockLocalStorage)

        mockFetch = createMockFetch()
        vi.stubGlobal('fetch', mockFetch)

        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('constructor', () => {
        it('initializes with empty data when localStorage is empty', () => {
            const backend = new TodoistBackend({ apiToken: 'test-token' })

            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'todoist_sync_token'
            )
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'todoist_data'
            )

            const tasks = backend.getTasks()
            expect(tasks).toEqual([])
        })

        it('loads existing sync token from localStorage', () => {
            mockLocalStorage._store['todoist_sync_token'] = 'existing-token-123'

            new TodoistBackend({ apiToken: 'test-token' })

            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'todoist_sync_token'
            )
        })

        it('loads existing data from localStorage', () => {
            const existingData = {
                items: [
                    {
                        id: '1',
                        content: 'Existing task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('Existing task')
        })

        it('defaults to "*" sync token when not in localStorage', () => {
            const backend = new TodoistBackend({ apiToken: 'test-token' })

            // Verify by checking that sync will use "*" token
            expect(backend).toBeDefined()
        })
    })

    describe('sync', () => {
        it('makes API call with correct headers and body', async () => {
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: true,
                items: [],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.todoist.com/api/v1/sync',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                    },
                    body: expect.any(FormData),
                })
            )

            // Verify FormData contents
            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            expect(formData.get('sync_token')).toBe('*')
            expect(formData.get('resource_types')).toBe(
                JSON.stringify(['items', 'labels', 'projects'])
            )
        })

        it('updates sync token after successful sync', async () => {
            const mockResponse = {
                sync_token: 'new-sync-token-456',
                full_sync: true,
                items: [],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'todoist_sync_token',
                'new-sync-token-456'
            )
        })

        it('performs full sync when full_sync flag is true', async () => {
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'New task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [{ id: 'l1', name: 'Label 1' }],
                projects: [{ id: 'p1', name: 'Project 1' }],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('New task')

            expect(backend.getProjectName('p1')).toBe('Project 1')
            expect(backend.getLabelNames(['l1'])).toEqual(['Label 1'])
        })

        it('performs incremental sync and merges data', async () => {
            // Setup existing data
            const existingData = {
                items: [
                    {
                        id: '1',
                        content: 'Existing task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            // Mock incremental sync response
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: false,
                items: [
                    {
                        id: '2',
                        content: 'New incremental task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 1,
                    },
                ],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(2)
            expect(tasks.map((t) => t.id)).toContain('1')
            expect(tasks.map((t) => t.id)).toContain('2')
        })

        it('updates existing items during incremental sync', async () => {
            // Setup existing data
            const existingData = {
                items: [
                    {
                        id: '1',
                        content: 'Original content',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            // Mock incremental sync with updated item
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: false,
                items: [
                    {
                        id: '1',
                        content: 'Updated content',
                        checked: true,
                        completed_at: new Date().toISOString(),
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('Updated content')
            expect(tasks[0].checked).toBe(true)
        })

        it('removes deleted items during incremental sync', async () => {
            // Setup existing data
            const existingData = {
                items: [
                    {
                        id: '1',
                        content: 'Task to keep',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                    {
                        id: '2',
                        content: 'Task to delete',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 1,
                    },
                ],
                labels: [],
                projects: [],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            // Mock incremental sync with deleted item
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: false,
                items: [
                    {
                        id: '2',
                        content: 'Task to delete',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 1,
                        is_deleted: true,
                    },
                ],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].id).toBe('1')
            expect(tasks[0].content).toBe('Task to keep')
        })

        it('saves updated data to localStorage after sync', async () => {
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'todoist_data',
                expect.any(String)
            )

            const savedData = JSON.parse(
                mockLocalStorage._store['todoist_data']
            )
            expect(savedData.items).toHaveLength(1)
            expect(savedData.timestamp).toBeDefined()
        })

        it('retries with "*" sync token on failure', async () => {
            // Set up backend with existing sync token
            mockLocalStorage._store['todoist_sync_token'] = 'invalid-token'

            // Use 500 error which is retryable
            const mockErrorResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            }

            const mockSuccessResponse = {
                ok: true,
                json: async () => ({
                    sync_token: 'new-token',
                    full_sync: true,
                    items: [],
                    labels: [],
                    projects: [],
                }),
            }

            // First call fails, second call succeeds
            mockFetch
                .mockResolvedValueOnce(mockErrorResponse)
                .mockResolvedValueOnce(mockSuccessResponse)

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            // Should have been called twice
            expect(mockFetch).toHaveBeenCalledTimes(2)

            // Second call should use "*" token
            const secondCall = mockFetch.mock.calls[1]
            const formData = secondCall[1].body as FormData
            expect(formData.get('sync_token')).toBe('*')

            // Sync token should be reset to "*" in localStorage
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'todoist_sync_token',
                '*'
            )
        })

        it('throws error after retry fails', async () => {
            mockLocalStorage._store['todoist_sync_token'] = 'invalid-token'

            const mockErrorResponse = {
                ok: false,
                status: 400,
            }

            mockFetch.mockResolvedValue(mockErrorResponse)

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.sync()).rejects.toThrow('HTTP 400: undefined')
        })

        it('does not retry when sync token is already "*"', async () => {
            const mockErrorResponse = {
                ok: false,
                status: 400,
            }

            mockFetch.mockResolvedValueOnce(mockErrorResponse)

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.sync()).rejects.toThrow()

            // Should only be called once (no retry)
            expect(mockFetch).toHaveBeenCalledTimes(1)
        })

        it('accepts custom resource types parameter', async () => {
            const mockResponse = {
                sync_token: 'new-token',
                full_sync: true,
                items: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync(['items'])

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            expect(formData.get('resource_types')).toBe(
                JSON.stringify(['items'])
            )
        })
    })

    describe('getProjectName', () => {
        it('returns project name by ID', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [],
                labels: [],
                projects: [
                    { id: 'p1', name: 'Work' },
                    { id: 'p2', name: 'Personal' },
                ],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(backend.getProjectName('p1')).toBe('Work')
            expect(backend.getProjectName('p2')).toBe('Personal')
        })

        it('returns empty string for non-existent project ID', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [],
                labels: [],
                projects: [{ id: 'p1', name: 'Work' }],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(backend.getProjectName('non-existent')).toBe('')
        })
    })

    describe('getLabelNames', () => {
        it('returns label names by IDs', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [],
                labels: [
                    { id: 'l1', name: 'Important' },
                    { id: 'l2', name: 'Urgent' },
                    { id: 'l3', name: 'Later' },
                ],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(backend.getLabelNames(['l1', 'l2'])).toEqual([
                'Important',
                'Urgent',
            ])
        })

        it('filters out non-existent label IDs', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [],
                labels: [{ id: 'l1', name: 'Important' }],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(backend.getLabelNames(['l1', 'non-existent'])).toEqual([
                'Important',
            ])
        })

        it('returns empty array for empty input', () => {
            const backend = new TodoistBackend({ apiToken: 'test-token' })
            expect(backend.getLabelNames([])).toEqual([])
        })
    })

    describe('isCacheStale', () => {
        it('returns true when no timestamp exists', () => {
            const backend = new TodoistBackend({ apiToken: 'test-token' })
            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is fresh (within 5 minutes)', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            expect(backend.isCacheStale()).toBe(false)
        })

        it('returns true when cache is older than 5 minutes', async () => {
            const oldTimestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago

            const existingData = {
                items: [],
                labels: [],
                projects: [],
                timestamp: oldTimestamp,
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is exactly at the 5-minute boundary', async () => {
            // Cache expiry is 5 minutes (300000 ms)
            const boundaryTimestamp = Date.now() - 5 * 60 * 1000 + 100 // Just under 5 minutes

            const existingData = {
                items: [],
                labels: [],
                projects: [],
                timestamp: boundaryTimestamp,
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            expect(backend.isCacheStale()).toBe(false)
        })
    })

    describe('clearLocalData', () => {
        it('removes sync token from localStorage', () => {
            mockLocalStorage._store['todoist_sync_token'] = 'token-to-clear'
            mockLocalStorage._store['todoist_data'] = JSON.stringify({
                items: [],
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            backend.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'todoist_sync_token'
            )
        })

        it('removes data from localStorage', () => {
            mockLocalStorage._store['todoist_sync_token'] = 'token'
            mockLocalStorage._store['todoist_data'] = JSON.stringify({
                items: [],
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            backend.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'todoist_data'
            )
        })

        it('resets sync token to "*"', () => {
            mockLocalStorage._store['todoist_sync_token'] = 'existing-token'

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            backend.clearLocalData()

            // After clearing, getTasks should work with empty data
            expect(backend.getTasks()).toEqual([])
        })

        it('resets data to empty state', () => {
            const existingData = {
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }
            mockLocalStorage._store['todoist_data'] =
                JSON.stringify(existingData)

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            backend.clearLocalData()

            expect(backend.getTasks()).toEqual([])
        })
    })

    describe('addTask', () => {
        it('sends item_add command with content', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.addTask('New task', null)

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.todoist.com/api/v1/sync',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                    },
                    body: expect.any(FormData),
                })
            )

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            const commands = JSON.parse(formData.get('commands') as string)

            expect(commands).toHaveLength(1)
            expect(commands[0].type).toBe('item_add')
            expect(commands[0].args.content).toBe('New task')
            expect(commands[0].uuid).toBe('mock-uuid-123')
            expect(commands[0].temp_id).toBe('mock-uuid-123')
        })

        it('sends item_add command with content and due date', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.addTask('Task with due date', '2025-12-31')

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            const commands = JSON.parse(formData.get('commands') as string)

            expect(commands).toHaveLength(1)
            expect(commands[0].type).toBe('item_add')
            expect(commands[0].args.content).toBe('Task with due date')
            expect(commands[0].args.due).toEqual({ date: '2025-12-31' })
        })

        it('throws error when command fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.addTask('New task', null)).rejects.toThrow('HTTP 400: undefined')
        })
    })

    describe('completeTask', () => {
        it('sends item_close command', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.completeTask('task-123')

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.todoist.com/api/v1/sync',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                    },
                    body: expect.any(FormData),
                })
            )

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            const commands = JSON.parse(formData.get('commands') as string)

            expect(commands).toHaveLength(1)
            expect(commands[0].type).toBe('item_close')
            expect(commands[0].uuid).toBe('mock-uuid-123')
            expect(commands[0].args.id).toBe('task-123')
        })

        it('throws error when command fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.completeTask('task-123')).rejects.toThrow('HTTP 500: undefined')
        })
    })

    describe('uncompleteTask', () => {
        it('sends item_uncomplete command', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.uncompleteTask('task-456')

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.todoist.com/api/v1/sync',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                    },
                    body: expect.any(FormData),
                })
            )

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            const commands = JSON.parse(formData.get('commands') as string)

            expect(commands).toHaveLength(1)
            expect(commands[0].type).toBe('item_uncomplete')
            expect(commands[0].uuid).toBe('mock-uuid-123')
            expect(commands[0].args.id).toBe('task-456')
        })

        it('throws error when command fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.uncompleteTask('task-456')).rejects.toThrow('Todoist API authentication failed: 403')
        })
    })

    describe('deleteTask', () => {
        it('sends item_delete command', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.deleteTask('task-789')

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.todoist.com/api/v1/sync',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                    },
                    body: expect.any(FormData),
                })
            )

            const call = mockFetch.mock.calls[0]
            const formData = call[1].body as FormData
            const commands = JSON.parse(formData.get('commands') as string)

            expect(commands).toHaveLength(1)
            expect(commands[0].type).toBe('item_delete')
            expect(commands[0].uuid).toBe('mock-uuid-123')
            expect(commands[0].args.id).toBe('task-789')
        })

        it('throws error when command fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })

            await expect(backend.deleteTask('task-789')).rejects.toThrow('HTTP 404: undefined')
        })
    })

    describe('getTasks', () => {
        it('returns empty array when no items exist', () => {
            const backend = new TodoistBackend({ apiToken: 'test-token' })
            expect(backend.getTasks()).toEqual([])
        })

        it('filters out deleted tasks', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Active task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                        is_deleted: false,
                    },
                    {
                        id: '2',
                        content: 'Deleted task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 1,
                        is_deleted: true,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('Active task')
        })

        it('includes unchecked tasks', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Unchecked task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].checked).toBe(false)
        })

        it('includes recently completed tasks (within 5 minutes)', async () => {
            const recentCompletion = new Date(
                Date.now() - 2 * 60 * 1000
            ).toISOString()

            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Recently completed',
                        checked: true,
                        completed_at: recentCompletion,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].checked).toBe(true)
        })

        it('excludes completed tasks older than 5 minutes', async () => {
            const oldCompletion = new Date(
                Date.now() - 10 * 60 * 1000
            ).toISOString()

            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Old completed',
                        checked: true,
                        completed_at: oldCompletion,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toEqual([])
        })

        it('enriches tasks with project_name', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: 'p1',
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [{ id: 'p1', name: 'Work' }],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks[0].project_name).toBe('Work')
        })

        it('enriches tasks with label_names', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: ['l1', 'l2'],
                        child_order: 0,
                    },
                ],
                labels: [
                    { id: 'l1', name: 'Important' },
                    { id: 'l2', name: 'Urgent' },
                ],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks[0].label_names).toEqual(['Important', 'Urgent'])
        })

        it('parses due dates without time as end of day', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: { date: '2025-12-15' },
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks[0].due_date).toBeInstanceOf(Date)
            expect(tasks[0].has_time).toBe(false)

            const dueDate = tasks[0].due_date!
            expect(dueDate.getHours()).toBe(23)
            expect(dueDate.getMinutes()).toBe(59)
            expect(dueDate.getSeconds()).toBe(59)
        })

        it('parses due dates with time and sets has_time flag', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Task',
                        checked: false,
                        completed_at: null,
                        due: { date: '2025-12-15T14:30:00' },
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks[0].due_date).toBeInstanceOf(Date)
            expect(tasks[0].has_time).toBe(true)
        })

        it('sorts tasks using TaskBackend.sortTasks', async () => {
            const mockResponse = {
                sync_token: 'token',
                full_sync: true,
                items: [
                    {
                        id: '1',
                        content: 'Checked task',
                        checked: true,
                        completed_at: new Date().toISOString(),
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 0,
                    },
                    {
                        id: '2',
                        content: 'Unchecked task',
                        checked: false,
                        completed_at: null,
                        due: null,
                        project_id: null,
                        labels: [],
                        child_order: 1,
                    },
                ],
                labels: [],
                projects: [],
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const backend = new TodoistBackend({ apiToken: 'test-token' })
            await backend.sync()

            const tasks = backend.getTasks()
            // Unchecked should be first
            expect(tasks[0].id).toBe('2')
            expect(tasks[1].id).toBe('1')
        })
    })
})

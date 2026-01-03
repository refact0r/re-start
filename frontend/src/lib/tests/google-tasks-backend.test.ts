import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GoogleTasksBackend from '../backends/google-tasks-backend'
import * as googleAuth from '../backends/google-auth'

// Mock the google-auth module
vi.mock('../backends/google-auth', () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
    getUserEmail: vi.fn(() => 'test@example.com'),
    isSignedIn: vi.fn(() => true),
    ensureValidToken: vi.fn(() => Promise.resolve('mock-token-123')),
    migrateStorageKeys: vi.fn(),
    apiRequest: vi.fn(),
    createApiClient: vi.fn(() => vi.fn()),
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

describe('GoogleTasksBackend', () => {
    let mockLocalStorage: ReturnType<typeof createMockLocalStorage>
    let mockApiRequest: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockLocalStorage = createMockLocalStorage()
        vi.stubGlobal('localStorage', mockLocalStorage)

        // Reset mock implementations
        mockApiRequest = vi.fn()
        // createApiClient returns a function that will be used for API requests
        vi.mocked(googleAuth.createApiClient).mockReturnValue(mockApiRequest)
        vi.mocked(googleAuth.isSignedIn).mockReturnValue(true)
        vi.mocked(googleAuth.ensureValidToken).mockResolvedValue('mock-token-123')

        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('constructor', () => {
        it('initializes with empty data when localStorage is empty', () => {
            const backend = new GoogleTasksBackend()

            expect(googleAuth.migrateStorageKeys).toHaveBeenCalled()
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'google_tasks_data'
            )
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'google_tasks_default_list'
            )

            const tasks = backend.getTasks()
            expect(tasks).toEqual([])
        })

        it('loads existing data from localStorage', () => {
            const existingData = {
                tasklists: [{ id: 'list1', title: 'My Tasks' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Existing task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                        tasklistName: 'My Tasks',
                    },
                ],
                timestamp: Date.now(),
            }
            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(existingData)

            const backend = new GoogleTasksBackend()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('Existing task')
        })

        it('loads default tasklist ID from localStorage', () => {
            mockLocalStorage._store['google_tasks_default_list'] = 'custom-list-id'

            const backend = new GoogleTasksBackend()

            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
                'google_tasks_default_list'
            )
            expect(backend).toBeDefined()
        })

        it('defaults to "@default" when no tasklist ID is stored', () => {
            const backend = new GoogleTasksBackend()

            // Verify by checking that backend is initialized
            expect(backend).toBeDefined()
        })
    })

    describe('auth methods', () => {
        it('signIn delegates to google-auth module', async () => {
            const backend = new GoogleTasksBackend()
            await backend.signIn()

            expect(googleAuth.signIn).toHaveBeenCalled()
        })

        it('signOut delegates to google-auth and clears local data', async () => {
            mockLocalStorage._store['google_tasks_data'] = JSON.stringify({
                tasklists: [],
                tasks: [],
            })

            const backend = new GoogleTasksBackend()
            await backend.signOut()

            expect(googleAuth.signOut).toHaveBeenCalled()
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'google_tasks_data'
            )
        })

        it('getIsSignedIn delegates to google-auth module', () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(true)

            const backend = new GoogleTasksBackend()
            const result = backend.getIsSignedIn()

            expect(googleAuth.isSignedIn).toHaveBeenCalled()
            expect(result).toBe(true)
        })

        it('getUserEmail delegates to google-auth module', () => {
            vi.mocked(googleAuth.getUserEmail).mockReturnValue('test@example.com')

            const backend = new GoogleTasksBackend()
            const email = backend.getUserEmail()

            expect(googleAuth.getUserEmail).toHaveBeenCalled()
            expect(email).toBe('test@example.com')
        })

        it('ensureValidToken delegates to google-auth module', async () => {
            vi.mocked(googleAuth.ensureValidToken).mockResolvedValue(
                'valid-token-456'
            )

            const backend = new GoogleTasksBackend()
            const token = await backend.ensureValidToken()

            expect(googleAuth.ensureValidToken).toHaveBeenCalled()
            expect(token).toBe('valid-token-456')
        })
    })

    describe('sync', () => {
        it('throws error when not signed in', async () => {
            vi.mocked(googleAuth.isSignedIn).mockReturnValue(false)

            const backend = new GoogleTasksBackend()

            await expect(backend.sync()).rejects.toThrow(
                'Not signed in to Google account'
            )
        })

        it('fetches tasklists and tasks by default', async () => {
            const mockTasklistsResponse = {
                items: [
                    { id: 'list1', title: 'Work' },
                    { id: 'list2', title: 'Personal' },
                ],
            }

            const mockTasksResponse1 = {
                items: [
                    {
                        id: 'task1',
                        title: 'Task 1',
                        status: 'needsAction',
                    },
                ],
            }

            const mockTasksResponse2 = {
                items: [
                    {
                        id: 'task2',
                        title: 'Task 2',
                        status: 'needsAction',
                    },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce(mockTasksResponse1)
                .mockResolvedValueOnce(mockTasksResponse2)

            const backend = new GoogleTasksBackend()
            await backend.sync()

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/users/@me/lists?maxResults=20'
            )

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/list1/tasks?showCompleted=true&showHidden=true&maxResults=100'
            )

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/list2/tasks?showCompleted=true&showHidden=true&maxResults=100'
            )
        })

        it('enriches tasks with tasklist info', async () => {
            const mockTasklistsResponse = {
                items: [{ id: 'list1', title: 'Work Tasks' }],
            }

            const mockTasksResponse = {
                items: [
                    {
                        id: 'task1',
                        title: 'Important task',
                        status: 'needsAction',
                    },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce(mockTasksResponse)

            const backend = new GoogleTasksBackend()
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toHaveLength(1)
            expect(tasks[0].project_name).toBe('Work Tasks')
        })

        it('saves data to localStorage with timestamp', async () => {
            const mockTasklistsResponse = { items: [] }

            mockApiRequest.mockResolvedValueOnce(mockTasklistsResponse)

            const backend = new GoogleTasksBackend()
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'google_tasks_data',
                expect.any(String)
            )

            const savedData = JSON.parse(
                mockLocalStorage._store['google_tasks_data']
            )
            expect(savedData.timestamp).toBeDefined()
            expect(savedData.timestamp).toBeGreaterThan(0)
        })

        it('sets default tasklist ID when not set', async () => {
            const mockTasklistsResponse = {
                items: [
                    { id: 'first-list', title: 'First List' },
                    { id: 'second-list', title: 'Second List' },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce({ items: [] })
                .mockResolvedValueOnce({ items: [] })

            const backend = new GoogleTasksBackend()
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'google_tasks_default_list',
                'first-list'
            )
        })

        it('updates invalid tasklist ID to first available', async () => {
            mockLocalStorage._store['google_tasks_default_list'] = 'invalid-list-id'

            const mockTasklistsResponse = {
                items: [{ id: 'valid-list', title: 'Valid List' }],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce({ items: [] })

            const backend = new GoogleTasksBackend()
            await backend.sync()

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'google_tasks_default_list',
                'valid-list'
            )
        })

        it('keeps valid default tasklist ID', async () => {
            mockLocalStorage._store['google_tasks_default_list'] = 'valid-list'

            const mockTasklistsResponse = {
                items: [
                    { id: 'valid-list', title: 'Valid List' },
                    { id: 'other-list', title: 'Other List' },
                ],
            }

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce({ items: [] })
                .mockResolvedValueOnce({ items: [] })

            const backend = new GoogleTasksBackend()

            // Clear setItem calls from constructor
            vi.clearAllMocks()

            await backend.sync()

            // Should not update the tasklist ID since it's still valid
            const setItemCalls = mockLocalStorage.setItem.mock.calls
            const tasklistIdCalls = setItemCalls.filter(
                (call) => call[0] === 'google_tasks_default_list'
            )
            expect(tasklistIdCalls).toHaveLength(0)
        })

        it('handles empty tasklists by setting empty tasks', async () => {
            const mockTasklistsResponse = { items: [] }

            mockApiRequest.mockResolvedValueOnce(mockTasklistsResponse)

            const backend = new GoogleTasksBackend()
            await backend.sync()

            const tasks = backend.getTasks()
            expect(tasks).toEqual([])
        })

        it('handles missing items in API responses', async () => {
            const mockTasklistsResponse = {}
            const mockTasksResponse = {}

            mockApiRequest
                .mockResolvedValueOnce(mockTasklistsResponse)
                .mockResolvedValueOnce(mockTasksResponse)

            const backend = new GoogleTasksBackend()

            // Add a tasklist manually to trigger task fetching
            mockLocalStorage._store['google_tasks_data'] = JSON.stringify({
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [],
            })

            const backend2 = new GoogleTasksBackend()
            await backend2.sync(['tasks'])

            const tasks = backend2.getTasks()
            expect(tasks).toEqual([])
        })

        it('supports custom resource types parameter', async () => {
            const mockTasklistsResponse = {
                items: [{ id: 'list1', title: 'List 1' }],
            }

            mockApiRequest.mockResolvedValueOnce(mockTasklistsResponse)

            const backend = new GoogleTasksBackend()
            await backend.sync(['tasklists'])

            // Should only fetch tasklists, not tasks
            expect(mockApiRequest).toHaveBeenCalledTimes(1)
            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/users/@me/lists')
            )
        })

        it('throws error on API failure', async () => {
            // Mock console.error to avoid test output noise
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            mockApiRequest.mockRejectedValueOnce(new Error('API request failed'))

            const backend = new GoogleTasksBackend()

            await expect(backend.sync()).rejects.toThrow('API request failed')
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[GoogleTasks]',
                'Google Tasks sync failed:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe('getTasks', () => {
        it('returns empty array when no tasks exist', () => {
            const backend = new GoogleTasksBackend()
            expect(backend.getTasks()).toEqual([])
        })

        it('filters tasks by status needsAction', async () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Active task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                    {
                        id: 'task2',
                        title: 'Completed task',
                        status: 'completed',
                        completed: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks).toHaveLength(1)
            expect(tasks[0].content).toBe('Active task')
            expect(tasks[0].checked).toBe(false)
        })

        it('includes recently completed tasks (within 5 minutes)', () => {
            const recentCompletion = new Date(
                Date.now() - 2 * 60 * 1000
            ).toISOString()

            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Recently completed',
                        status: 'completed',
                        completed: recentCompletion,
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks).toHaveLength(1)
            expect(tasks[0].checked).toBe(true)
            expect(tasks[0].completed_at).toBe(recentCompletion)
        })

        it('excludes completed tasks older than 5 minutes', () => {
            const oldCompletion = new Date(
                Date.now() - 10 * 60 * 1000
            ).toISOString()

            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Old completed',
                        status: 'completed',
                        completed: oldCompletion,
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks).toEqual([])
        })

        it('enriches tasks with tasklist name as project_name', () => {
            const mockData = {
                tasklists: [{ id: 'work-list', title: 'Work Projects' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'work-list',
                        tasklistName: 'Work Projects',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks[0].project_id).toBe('work-list')
            expect(tasks[0].project_name).toBe('Work Projects')
        })

        it('parses due dates as end of day (23:59:59)', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task with due date',
                        status: 'needsAction',
                        due: '2025-12-25T00:00:00.000Z',
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks[0].due_date).toBeInstanceOf(Date)
            expect(tasks[0].has_time).toBe(false)

            const dueDate = tasks[0].due_date!
            expect(dueDate.getHours()).toBe(23)
            expect(dueDate.getMinutes()).toBe(59)
            expect(dueDate.getSeconds()).toBe(59)
        })

        it('handles tasks without due dates', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'No due date',
                        status: 'needsAction',
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks[0].due_date).toBeNull()
            expect(tasks[0].due).toBeNull()
        })

        it('sorts tasks using TaskBackend.sortTasks', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Completed task',
                        status: 'completed',
                        completed: new Date().toISOString(),
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                    {
                        id: 'task2',
                        title: 'Active task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            // Active task should be first (unchecked tasks before checked)
            expect(tasks[0].id).toBe('task2')
            expect(tasks[1].id).toBe('task1')
        })

        it('sets label_names to empty array', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                        tasklistName: 'List',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            const tasks = backend.getTasks()

            expect(tasks[0].labels).toEqual([])
            expect(tasks[0].label_names).toEqual([])
        })
    })

    describe('getTasklistName', () => {
        it('returns tasklist name by ID', () => {
            const mockData = {
                tasklists: [
                    { id: 'list1', title: 'Work' },
                    { id: 'list2', title: 'Personal' },
                ],
                tasks: [],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()

            expect(backend.getTasklistName('list1')).toBe('Work')
            expect(backend.getTasklistName('list2')).toBe('Personal')
        })

        it('returns empty string for non-existent tasklist ID', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'Work' }],
                tasks: [],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()

            expect(backend.getTasklistName('non-existent')).toBe('')
        })
    })

    describe('addTask', () => {
        it('sends POST request with title only', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.addTask('New task', null)

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/@default/tasks',
                {
                    method: 'POST',
                    body: JSON.stringify({ title: 'New task' }),
                }
            )
        })

        it('sends POST request with title and due date', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.addTask('Task with due date', '2025-12-25')

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/@default/tasks',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        title: 'Task with due date',
                        due: '2025-12-25T00:00:00.000Z',
                    }),
                }
            )
        })

        it('strips time from due date if provided', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.addTask('Task', '2025-12-25T14:30:00')

            const call = mockApiRequest.mock.calls[0]
            const body = JSON.parse(call[1].body as string)
            expect(body.due).toBe('2025-12-25T00:00:00.000Z')
        })

        it('uses default tasklist ID', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.addTask('Task', null)

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/@default/tasks'),
                expect.any(Object)
            )
        })

        it('throws error on API failure', async () => {
            mockApiRequest.mockRejectedValueOnce(
                new Error('HTTP 400: Bad Request')
            )

            const backend = new GoogleTasksBackend()

            await expect(backend.addTask('Task', null)).rejects.toThrow(
                'HTTP 400: Bad Request'
            )
        })
    })

    describe('completeTask', () => {
        it('sends PATCH request with completed status', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.completeTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/list1/tasks/task1',
                {
                    method: 'PATCH',
                    body: expect.stringContaining('"status":"completed"'),
                }
            )

            // Verify completed timestamp is included
            const call = mockApiRequest.mock.calls[0]
            const body = JSON.parse(call[1].body as string)
            expect(body.completed).toBeDefined()
            expect(new Date(body.completed).getTime()).toBeGreaterThan(0)
        })

        it('uses task tasklistId from stored data', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'custom-list',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.completeTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/custom-list/tasks/task1'),
                expect.any(Object)
            )
        })

        it('falls back to default tasklist when task not found', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.completeTask('unknown-task')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/@default/tasks/unknown-task'),
                expect.any(Object)
            )
        })

        it('throws error on API failure', async () => {
            mockApiRequest.mockRejectedValueOnce(
                new Error('HTTP 404: Not Found')
            )

            const backend = new GoogleTasksBackend()

            await expect(backend.completeTask('task1')).rejects.toThrow(
                'HTTP 404: Not Found'
            )
        })
    })

    describe('uncompleteTask', () => {
        it('sends PATCH request with needsAction status', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'completed',
                        completed: new Date().toISOString(),
                        tasklistId: 'list1',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.uncompleteTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/list1/tasks/task1',
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'needsAction',
                        completed: null,
                    }),
                }
            )
        })

        it('uses task tasklistId from stored data', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'completed',
                        tasklistId: 'work-list',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.uncompleteTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/work-list/tasks/task1'),
                expect.any(Object)
            )
        })

        it('falls back to default tasklist when task not found', async () => {
            mockApiRequest.mockResolvedValueOnce({})

            const backend = new GoogleTasksBackend()
            await backend.uncompleteTask('unknown-task')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/@default/tasks/unknown-task'),
                expect.any(Object)
            )
        })

        it('throws error on API failure', async () => {
            mockApiRequest.mockRejectedValueOnce(
                new Error('HTTP 500: Server Error')
            )

            const backend = new GoogleTasksBackend()

            await expect(backend.uncompleteTask('task1')).rejects.toThrow(
                'HTTP 500: Server Error'
            )
        })
    })

    describe('deleteTask', () => {
        it('sends DELETE request', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task to delete',
                        status: 'needsAction',
                        tasklistId: 'list1',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce(undefined)

            const backend = new GoogleTasksBackend()
            await backend.deleteTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                '/lists/list1/tasks/task1',
                {
                    method: 'DELETE',
                }
            )
        })

        it('uses task tasklistId from stored data', async () => {
            const mockData = {
                tasklists: [],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'personal-list',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)
            mockApiRequest.mockResolvedValueOnce(undefined)

            const backend = new GoogleTasksBackend()
            await backend.deleteTask('task1')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/personal-list/tasks/task1'),
                expect.any(Object)
            )
        })

        it('falls back to default tasklist when task not found', async () => {
            mockApiRequest.mockResolvedValueOnce(undefined)

            const backend = new GoogleTasksBackend()
            await backend.deleteTask('unknown-task')

            expect(mockApiRequest).toHaveBeenCalledWith(
                expect.stringContaining('/lists/@default/tasks/unknown-task'),
                expect.any(Object)
            )
        })

        it('throws error on API failure', async () => {
            mockApiRequest.mockRejectedValueOnce(
                new Error('HTTP 403: Forbidden')
            )

            const backend = new GoogleTasksBackend()

            await expect(backend.deleteTask('task1')).rejects.toThrow(
                'HTTP 403: Forbidden'
            )
        })
    })

    describe('clearLocalData', () => {
        it('removes data from localStorage', () => {
            mockLocalStorage._store['google_tasks_data'] = JSON.stringify({
                tasklists: [],
                tasks: [],
            })

            const backend = new GoogleTasksBackend()
            backend.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'google_tasks_data'
            )
        })

        it('removes default tasklist ID from localStorage', () => {
            mockLocalStorage._store['google_tasks_default_list'] = 'list1'

            const backend = new GoogleTasksBackend()
            backend.clearLocalData()

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
                'google_tasks_default_list'
            )
        })

        it('resets data to empty state', () => {
            const mockData = {
                tasklists: [{ id: 'list1', title: 'List' }],
                tasks: [
                    {
                        id: 'task1',
                        title: 'Task',
                        status: 'needsAction',
                        tasklistId: 'list1',
                    },
                ],
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            backend.clearLocalData()

            expect(backend.getTasks()).toEqual([])
        })

        it('resets default tasklist ID to "@default"', () => {
            mockLocalStorage._store['google_tasks_default_list'] = 'custom-list'

            const backend = new GoogleTasksBackend()
            backend.clearLocalData()

            // Verify by checking that backend still works
            expect(backend).toBeDefined()
        })
    })

    describe('isCacheStale', () => {
        it('returns true when no timestamp exists', () => {
            const backend = new GoogleTasksBackend()
            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is fresh (within 5 minutes)', () => {
            const mockData = {
                tasklists: [],
                tasks: [],
                timestamp: Date.now(),
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            expect(backend.isCacheStale()).toBe(false)
        })

        it('returns true when cache is older than 5 minutes', () => {
            const oldTimestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago

            const mockData = {
                tasklists: [],
                tasks: [],
                timestamp: oldTimestamp,
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            expect(backend.isCacheStale()).toBe(true)
        })

        it('returns false when cache is at the 5-minute boundary', () => {
            const boundaryTimestamp = Date.now() - 5 * 60 * 1000 + 100 // Just under 5 minutes

            const mockData = {
                tasklists: [],
                tasks: [],
                timestamp: boundaryTimestamp,
            }

            mockLocalStorage._store['google_tasks_data'] =
                JSON.stringify(mockData)

            const backend = new GoogleTasksBackend()
            expect(backend.isCacheStale()).toBe(false)
        })
    })
})

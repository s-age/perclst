import { vi, describe, it, expect, beforeEach } from 'vitest'
import { listCommand } from '../list.ts'
import { parseListSessions } from '@src/validators/cli/listSessions'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import Table from 'cli-table3'

const { mockStdoutPrint, mockStderrPrint, mockTableInstance, mockContainerResolve } = vi.hoisted(
  () => {
    const containerResolve = vi.fn()
    return {
      mockStdoutPrint: vi.fn(),
      mockStderrPrint: vi.fn(),
      mockTableInstance: {
        push: vi.fn(),
        toString: vi.fn().mockReturnValue('table output')
      },
      mockContainerResolve: containerResolve
    }
  }
)

vi.mock('@src/validators/cli/listSessions')
vi.mock('@src/core/di/container', () => ({
  container: {
    resolve: mockContainerResolve
  }
}))
vi.mock('@src/core/di/identifiers', () => ({
  TOKENS: { SessionService: Symbol('SessionService') }
}))
vi.mock('@src/utils/output', () => ({
  stdout: { print: mockStdoutPrint },
  stderr: { print: mockStderrPrint }
}))
vi.mock('cli-table3', () => ({
  default: vi.fn(function () {
    this.push = mockTableInstance.push
    this.toString = mockTableInstance.toString
    return this
  })
}))

describe('listCommand', () => {
  let mockSessionList: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSessionList = vi.fn().mockResolvedValue([])

    // Clear call history
    mockStdoutPrint.mockClear()
    mockStderrPrint.mockClear()
    mockTableInstance.push.mockClear()

    // Set up mock return values
    vi.mocked(parseListSessions).mockReturnValue({
      label: undefined,
      like: undefined
    })
    mockContainerResolve.mockReturnValue({
      list: mockSessionList
    })
  })

  it('should list sessions successfully when sessions exist', async () => {
    const mockSessions = [
      {
        id: 'session-1',
        name: 'Task 1',
        working_dir: '/home/user',
        procedure: 'plan-feature',
        metadata: {
          status: 'active',
          labels: ['important', 'urgent']
        }
      },
      {
        id: 'session-2',
        name: 'Task 2',
        working_dir: '/home/user/project',
        procedure: null,
        metadata: {
          status: 'completed',
          labels: []
        }
      }
    ]

    mockSessionList.mockResolvedValue(mockSessions)

    await listCommand({ label: 'important' })

    expect(vi.mocked(parseListSessions)).toHaveBeenCalledWith({ label: 'important' })
    expect(mockSessionList).toHaveBeenCalledWith({
      label: undefined,
      like: undefined
    })
    expect(mockTableInstance.push).toHaveBeenCalledTimes(2)
    expect(mockTableInstance.push).toHaveBeenNthCalledWith(1, [
      'active',
      'Task 1',
      'session-1',
      '/home/user',
      'plan-feature',
      'important, urgent'
    ])
    expect(mockTableInstance.push).toHaveBeenNthCalledWith(2, [
      'completed',
      'Task 2',
      'session-2',
      '/home/user/project',
      '—',
      '—'
    ])
    expect(mockStdoutPrint).toHaveBeenCalledWith('table output')
  })

  it('should print "No sessions found" when sessions list is empty', async () => {
    mockSessionList.mockResolvedValue([])

    await listCommand({})

    expect(mockStdoutPrint).toHaveBeenCalledWith('No sessions found')
    expect(mockTableInstance.push).not.toHaveBeenCalled()
  })

  it('should pass filter options to sessionService.list', async () => {
    vi.mocked(parseListSessions).mockReturnValue({
      label: 'test-label',
      like: 'pattern'
    })

    await listCommand({ label: 'test-label', like: 'pattern' })

    expect(mockSessionList).toHaveBeenCalledWith({
      label: 'test-label',
      like: 'pattern'
    })
  })

  it.each([
    ['name is null', null, null, [], ['active', '—', 'session-1', '/home/user', '—', '—']],
    [
      'procedure is null',
      'Task',
      null,
      [],
      ['active', 'Task', 'session-1', '/home/user', '—', '—']
    ],
    [
      'labels are empty',
      'Task',
      'plan-feature',
      [],
      ['active', 'Task', 'session-1', '/home/user', 'plan-feature', '—']
    ],
    [
      'labels are joined',
      'Task',
      null,
      ['tag1', 'tag2', 'tag3'],
      ['active', 'Task', 'session-1', '/home/user', '—', 'tag1, tag2, tag3']
    ]
  ] as const)(
    'should display session row correctly when $label',
    async (_label, name, procedure, labels, expectedRow) => {
      const mockSessions = [
        {
          id: 'session-1',
          name,
          working_dir: '/home/user',
          procedure,
          metadata: { status: 'active', labels }
        }
      ]
      mockSessionList.mockResolvedValue(mockSessions)

      await listCommand({})

      expect(mockTableInstance.push).toHaveBeenCalledWith(expectedRow)
    }
  )

  it('should catch error from parseListSessions and exit', async () => {
    const testError = new Error('Invalid options')
    vi.mocked(parseListSessions).mockImplementation(() => {
      throw testError
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await listCommand({})

    expect(mockStderrPrint).toHaveBeenCalledWith('Failed to list sessions', testError)
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should catch error from sessionService.list and exit', async () => {
    const testError = new Error('Database error')
    mockSessionList.mockRejectedValue(testError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await listCommand({})

    expect(mockStderrPrint).toHaveBeenCalledWith('Failed to list sessions', testError)
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should resolve SessionService from container with correct token', async () => {
    mockSessionList.mockResolvedValue([])

    await listCommand({})

    expect(vi.mocked(container).resolve).toHaveBeenCalledWith(TOKENS.SessionService)
  })

  it('should create Table with correct configuration', async () => {
    const mockSessions = [
      {
        id: 'session-1',
        name: 'Task',
        working_dir: '/home/user',
        procedure: 'plan',
        metadata: {
          status: 'active',
          labels: []
        }
      }
    ]
    mockSessionList.mockResolvedValue(mockSessions)

    await listCommand({})

    expect(vi.mocked(Table)).toHaveBeenCalledWith({
      head: ['Status', 'Name', 'ID', 'Working Dir', 'Procedure', 'Labels'],
      style: { head: [], border: [] }
    })
  })
})

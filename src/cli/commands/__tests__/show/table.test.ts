import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import Table from 'cli-table3'
import ansis from 'ansis'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'
import { parseShowSession } from '@src/validators/cli/showSession'
import { showCommand } from '../../show'

// Mock all external dependencies
vi.mock('cli-table3')
vi.mock('ansis')
vi.mock('@src/core/di/container')
vi.mock('@src/services/sessionService')
vi.mock('@src/services/analyzeService')
vi.mock('@src/utils/output')
vi.mock('@src/utils/date')
vi.mock('@src/validators/cli/showSession')

describe('showCommand — table formatting', () => {
  // Mock implementations
  const mockSessionService = {
    resolveId: vi.fn(),
    get: vi.fn()
  } as unknown as SessionService

  const mockAnalyzeService = {
    analyze: vi.fn(),
    formatTurns: vi.fn()
  } as unknown as AnalyzeService

  const mockTableInstance = {
    push: vi.fn(),
    toString: vi.fn().mockReturnValue('table output')
  }

  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock instances
    mockTableInstance.push.mockClear()
    mockTableInstance.toString.mockClear()

    // Mock process.exit to prevent actual exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    // Setup container.resolve mocks
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (token === TOKENS.SessionService) return mockSessionService
      if (token === TOKENS.AnalyzeService) return mockAnalyzeService
      return undefined
    })

    // Setup default parseShowSession behavior
    vi.mocked(parseShowSession).mockImplementation((input: Record<string, unknown>) => ({
      sessionId: input.sessionId as string,
      format: input.format as string | undefined,
      head: input.head as string | undefined,
      tail: input.tail as string | undefined,
      order: input.order as string | undefined,
      length: input.length ? parseInt(input.length as string, 10) : undefined
    }))

    // Setup Table constructor mock
    vi.mocked(Table).mockImplementation(() => mockTableInstance as never)

    // Setup ansis.strip to return input as-is (default)
    vi.mocked(ansis.strip).mockImplementation((text: string) => text)

    // Setup toLocaleString mock
    vi.mocked(toLocaleString).mockReturnValue('2026-04-23T10:00:00Z')

    // Setup stdout/stderr
    vi.mocked(stdout.print).mockReturnValue(undefined)
    vi.mocked(stderr.print).mockReturnValue(undefined)
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('prints "(no turns)" message when there are no turns', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', {})

    expect(stdout.print).toHaveBeenCalledWith('\n(no turns)')
  })

  it('does not create table when there are no turns', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', {})

    expect(Table).not.toHaveBeenCalled()
  })

  it('creates table with correct headers', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([
      { n: 1, role: 'user', content: 'test' }
    ])

    await showCommand('sess-123', {})

    expect(Table).toHaveBeenCalledWith({
      head: ['N', 'role', 'content'],
      style: { head: [], border: [] }
    })
  })

  it('sets colWidths when length option is provided', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([
      { n: 1, role: 'user', content: 'test' }
    ])

    await showCommand('sess-123', { length: '80' })

    expect(Table).toHaveBeenCalledWith({
      head: ['N', 'role', 'content'],
      style: { head: [], border: [] },
      colWidths: [5, 13, 84] // 80 + 4
    })
  })

  it('does not set colWidths when length option is not provided', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([
      { n: 1, role: 'user', content: 'test' }
    ])

    await showCommand('sess-123', {})

    expect(Table).toHaveBeenCalledWith({
      head: ['N', 'role', 'content'],
      style: { head: [], border: [] }
    })
    expect(Table).not.toHaveBeenCalledWith(
      expect.objectContaining({ colWidths: expect.anything() })
    )
  })

  it('passes head parameter to formatTurns', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', { head: '5' })

    expect(mockAnalyzeService.formatTurns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ head: '5' })
    )
  })

  it('passes tail parameter to formatTurns', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', { tail: '10' })

    expect(mockAnalyzeService.formatTurns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tail: '10' })
    )
  })

  it('passes order parameter to formatTurns', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', { order: 'asc' })

    expect(mockAnalyzeService.formatTurns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ order: 'asc' })
    )
  })
})

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
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
vi.mock('@src/core/di/identifiers')
vi.mock('@src/services/sessionService')
vi.mock('@src/services/analyzeService')
vi.mock('@src/utils/output')
vi.mock('@src/utils/date')
vi.mock('@src/validators/cli/showSession')

describe('showCommand — display', () => {
  // Mock implementations
  const mockSessionService = {
    resolveId: vi.fn(),
    get: vi.fn()
  } as unknown as SessionService

  const mockAnalyzeService = {
    analyze: vi.fn(),
    formatTurns: vi.fn()
  } as unknown as AnalyzeService

  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

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

  it('displays session info and turns table in text format', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      name: 'My Session',
      created_at: new Date('2026-04-01'),
      updated_at: new Date('2026-04-23'),
      metadata: { status: 'active', labels: [] },
      working_dir: '/home/user/project',
      procedure: undefined,
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [{ n: 1, role: 'user', content: 'test' }] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([
      { n: 1, role: 'user', content: 'test message' }
    ])

    await showCommand('sess-123', {})

    expect(stdout.print).toHaveBeenCalledWith('\nSession: sess-123')
    expect(stdout.print).toHaveBeenCalledWith('Name:    My Session')
    expect(stdout.print).toHaveBeenCalledWith('Created: 2026-04-23T10:00:00Z')
    expect(stdout.print).toHaveBeenCalledWith('Updated: 2026-04-23T10:00:00Z')
    expect(stdout.print).toHaveBeenCalledWith('Status:  active')
    expect(stdout.print).toHaveBeenCalledWith('Dir:     /home/user/project')
  })

  it('includes name in output when session has name', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      name: 'Named Session',
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

    expect(stdout.print).toHaveBeenCalledWith('Name:    Named Session')
  })

  it('omits name from output when session has no name', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      name: undefined,
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

    const calls = vi.mocked(stdout.print).mock.calls.map((c) => c[0])
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringContaining('Name:')]))
  })

  it('includes procedure in output when session has procedure', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      procedure: 'analyze-code',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', {})

    expect(stdout.print).toHaveBeenCalledWith('Proc:    analyze-code')
  })

  it('omits procedure from output when session has no procedure', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      procedure: undefined,
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', {})

    const calls = vi.mocked(stdout.print).mock.calls.map((c) => c[0])
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringContaining('Proc:')]))
  })

  it('includes labels in output when session has labels', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: ['bug', 'urgent'] },
      working_dir: '/tmp',
      turns: []
    } as never)

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: { turns: [] }
    } as never)

    vi.mocked(mockAnalyzeService.formatTurns).mockReturnValue([])

    await showCommand('sess-123', {})

    expect(stdout.print).toHaveBeenCalledWith('Labels:  bug, urgent')
  })

  it('omits labels from output when session has no labels', async () => {
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

    const calls = vi.mocked(stdout.print).mock.calls.map((c) => c[0])
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringContaining('Labels:')]))
  })

  it('outputs JSON format when format option is json', async () => {
    const sessionData = {
      id: 'sess-123',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { status: 'active', labels: [] },
      working_dir: '/tmp',
      turns: []
    }

    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue(sessionData as never)

    const analyzeSummary = {
      turns: [
        { n: 1, role: 'user', content: 'hello' },
        { n: 2, role: 'assistant', content: 'hi' }
      ]
    }

    vi.mocked(mockAnalyzeService.analyze).mockResolvedValue({
      summary: analyzeSummary
    } as never)

    await showCommand('sess-123', { format: 'json' })

    expect(stdout.print).toHaveBeenCalledWith(
      JSON.stringify({ ...sessionData, turns: analyzeSummary.turns }, null, 2)
    )
  })

  it('does not call formatTurns when JSON format is requested', async () => {
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

    await showCommand('sess-123', { format: 'json' })

    expect(mockAnalyzeService.formatTurns).not.toHaveBeenCalled()
  })

  it('returns early after printing JSON format', async () => {
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

    await showCommand('sess-123', { format: 'json' })

    // Should only call stdout once for JSON output
    const stdoutCalls = vi.mocked(stdout.print).mock.calls.length
    expect(stdoutCalls).toBe(1)
  })
})

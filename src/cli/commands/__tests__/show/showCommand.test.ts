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

describe('showCommand — integration & error handling', () => {
  // Mock implementations
  const mockSessionService = {
    resolveId: vi.fn(),
    get: vi.fn()
  } as unknown as SessionService

  const mockAnalyzeService = {
    analyze: vi.fn(),
    formatTurns: vi.fn()
  } as unknown as AnalyzeService

  const mockExit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock process.exit to prevent actual exit
    vi.stubGlobal('process', { ...process, exit: mockExit } as unknown as NodeJS.Process)

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
    vi.unstubAllGlobals()
  })

  // --- Integration and Resolution ---

  it('resolves session ID before fetching', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('resolved-sess-123')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'resolved-sess-123',
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

    expect(mockSessionService.resolveId).toHaveBeenCalledWith('sess-123')
    expect(mockSessionService.get).toHaveBeenCalledWith('resolved-sess-123')
  })

  it('calls analyzeService.analyze with resolved session ID', async () => {
    vi.mocked(mockSessionService.resolveId).mockResolvedValue('sess-resolved')
    vi.mocked(mockSessionService.get).mockResolvedValue({
      id: 'sess-resolved',
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

    expect(mockAnalyzeService.analyze).toHaveBeenCalledWith('sess-resolved')
  })

  // --- Error Handling (validation) ---

  it('catches validation errors and prints to stderr', async () => {
    const validationError = new Error('Invalid session ID')
    vi.mocked(parseShowSession).mockImplementation(() => {
      throw validationError
    })

    try {
      await showCommand('invalid', {})
    } catch {
      // Expected to throw or exit
    }

    expect(stderr.print).toHaveBeenCalledWith('Failed to show session', validationError)
  })
})

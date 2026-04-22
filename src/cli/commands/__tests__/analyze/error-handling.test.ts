import { vi, describe, it, expect, beforeEach } from 'vitest'
import { analyzeCommand } from '../../analyze'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stderr } from '@src/utils/output'
import { parseAnalyzeSession } from '@src/validators/cli/analyzeSession'

vi.mock('@src/utils/output')
vi.mock('@src/core/di/container')
vi.mock('@src/validators/cli/analyzeSession')

type MockSessionService = {
  resolveId: ReturnType<typeof vi.fn>
}

type MockAnalyzeService = {
  analyze: ReturnType<typeof vi.fn>
}

describe('analyzeCommand - error handling', () => {
  let mockSessionService: MockSessionService
  let mockAnalyzeService: MockAnalyzeService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)

    mockSessionService = {
      resolveId: vi.fn()
    }
    mockAnalyzeService = {
      analyze: vi.fn()
    }

    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.SessionService) {
        return mockSessionService
      }
      if (token === TOKENS.AnalyzeService) {
        return mockAnalyzeService
      }
    })

    vi.mocked(parseAnalyzeSession).mockImplementation((input) => ({
      sessionId: input.sessionId,
      format: input.format,
      printDetail: input.printDetail ?? false
    }))
  })

  it('handles validation error from parseAnalyzeSession', async () => {
    const error = new Error('Invalid session ID format')
    vi.mocked(parseAnalyzeSession).mockImplementationOnce(() => {
      throw error
    })

    await analyzeCommand('invalid', {})

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to analyze session', error)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('handles error from resolveId', async () => {
    const error = new Error('Session not found')
    mockSessionService.resolveId.mockRejectedValueOnce(error)

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })

    await analyzeCommand('nonexistent', {})

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to analyze session', error)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('handles error from analyze service', async () => {
    const error = new Error('Analysis failed')
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockRejectedValueOnce(error)

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })

    await analyzeCommand('test-123', {})

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to analyze session', error)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})

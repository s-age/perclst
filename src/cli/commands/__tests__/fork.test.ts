import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { forkCommand } from '../fork'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'
import { parseForkSession } from '@src/validators/cli/forkSession'

vi.mock('@src/core/di/container')
vi.mock('@src/utils/output', () => ({
  stdout: { print: vi.fn() },
  stderr: { print: vi.fn() },
  debug: { print: vi.fn() }
}))
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/forkSession')

type MockSessionService = {
  resolveId: ReturnType<typeof vi.fn>
  createRewindSession: ReturnType<typeof vi.fn>
}

type MockAgentService = {
  resume: ReturnType<typeof vi.fn>
}

type MockConfig = {
  display: { header_color: string; no_color: boolean }
}

describe('forkCommand', () => {
  let mockSessionService: MockSessionService
  let mockAgentService: MockAgentService
  let mockConfig: MockConfig
  let mockParseForkSessionData: ReturnType<typeof parseForkSession>
  let mockExitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockSessionService = {
      resolveId: vi.fn(),
      createRewindSession: vi.fn()
    }

    mockAgentService = {
      resume: vi.fn()
    }

    mockConfig = {
      display: { header_color: '#D97757', no_color: false }
    }

    mockParseForkSessionData = {
      originalSessionId: 'original-session-123',
      prompt: 'test prompt',
      name: 'forked-session',
      allowedTools: ['Bash'],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: 10,
      maxContextTokens: 4000,
      format: 'text' as const
    }

    // Mock container.resolve to return our mocked services
    vi.mocked(container).resolve = vi.fn().mockImplementation((token: unknown): unknown => {
      if (token === TOKENS.SessionService) return mockSessionService
      if (token === TOKENS.AgentService) return mockAgentService
      if (token === TOKENS.Config) return mockConfig
      throw new Error(`Unknown token: ${String(token)}`)
    }) as never

    // Mock parseForkSession default behavior
    vi.mocked(parseForkSession).mockReturnValue(mockParseForkSessionData)

    // Mock service responses
    mockSessionService.resolveId.mockResolvedValue('resolved-session-123')
    mockSessionService.createRewindSession.mockResolvedValue({
      id: 'new-session-456',
      name: 'forked-session'
    })
    mockAgentService.resume.mockResolvedValue({
      text: 'Agent response',
      usage: { input_tokens: 100, output_tokens: 50 }
    })

    // Mock process.exit to prevent actual exit
    mockExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    mockExitSpy.mockRestore()
  })

  it('should successfully fork a session with happy path', async () => {
    await forkCommand('original-session-123', 'test prompt', {
      name: 'my-fork',
      model: 'claude-sonnet-4-6'
    })

    // Verify debug was called
    expect(vi.mocked(debug).print).toHaveBeenCalledWith('Forking session', {
      original_session_id: 'original-session-123'
    })

    // Verify parseForkSession was called with correct input
    expect(vi.mocked(parseForkSession)).toHaveBeenCalledWith({
      originalSessionId: 'original-session-123',
      prompt: 'test prompt',
      name: 'my-fork',
      model: 'claude-sonnet-4-6'
    })

    // Verify sessionService.resolveId was called
    expect(mockSessionService.resolveId).toHaveBeenCalledWith('original-session-123')

    // Verify sessionService.createRewindSession was called
    expect(mockSessionService.createRewindSession).toHaveBeenCalledWith(
      'resolved-session-123',
      undefined,
      'forked-session'
    )

    // Verify agentService.resume was called with correct options
    expect(mockAgentService.resume).toHaveBeenCalledWith('new-session-456', 'test prompt', {
      allowedTools: ['Bash'],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: 10,
      maxContextTokens: 4000
    })

    // Verify success message was printed
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Session forked: new-session-456')

    // Verify printResponse was called with correct config
    expect(vi.mocked(printResponse)).toHaveBeenCalledWith(
      {
        text: 'Agent response',
        usage: { input_tokens: 100, output_tokens: 50 }
      },
      mockParseForkSessionData,
      mockConfig.display,
      { sessionId: 'new-session-456' }
    )

    // Verify resume instruction was printed
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
      '\nTo resume: perclst resume new-session-456 "<instruction>"'
    )
  })

  it('should handle ValidationError and exit with status 1', async () => {
    const validationError = new ValidationError('Invalid arguments')
    vi.mocked(parseForkSession).mockImplementation(() => {
      throw validationError
    })

    await expect(forkCommand('session-id', 'prompt', {})).rejects.toThrow('process.exit called')

    // Verify error message was printed to stderr
    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: Invalid arguments')

    // Verify process.exit was called with status 1
    expect(mockExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle RateLimitError without resetInfo and exit with status 1', async () => {
    const rateLimitError = new RateLimitError('Rate limit exceeded')
    ;(rateLimitError as { resetInfo: string | undefined }).resetInfo = undefined
    vi.mocked(parseForkSession).mockReturnValue(mockParseForkSessionData)
    mockSessionService.resolveId.mockImplementation(() => {
      throw rateLimitError
    })

    await expect(forkCommand('session-id', 'prompt', {})).rejects.toThrow('process.exit called')

    // Verify error message without reset time
    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      'Claude usage limit reached. Please wait and try again.'
    )

    // Verify process.exit was called with status 1
    expect(mockExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle RateLimitError with resetInfo and exit with status 1', async () => {
    const rateLimitError = new RateLimitError('Rate limit exceeded')
    ;(rateLimitError as { resetInfo: string | undefined }).resetInfo = '2026-04-22T15:30:00Z'
    vi.mocked(parseForkSession).mockReturnValue(mockParseForkSessionData)
    mockSessionService.resolveId.mockImplementation(() => {
      throw rateLimitError
    })

    await expect(forkCommand('session-id', 'prompt', {})).rejects.toThrow('process.exit called')

    // Verify error message with reset time
    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      'Claude usage limit reached. Resets: 2026-04-22T15:30:00Z Please wait and try again.'
    )

    // Verify process.exit was called with status 1
    expect(mockExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle generic error and exit with status 1', async () => {
    const genericError = new Error('Something went wrong')
    vi.mocked(parseForkSession).mockReturnValue(mockParseForkSessionData)
    mockAgentService.resume.mockImplementation(() => {
      throw genericError
    })

    await expect(forkCommand('session-id', 'prompt', {})).rejects.toThrow('process.exit called')

    // Verify generic error message was printed to stderr
    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to fork session', genericError)

    // Verify process.exit was called with status 1
    expect(mockExitSpy).toHaveBeenCalledWith(1)
  })

  it('should call resolveId with parsed originalSessionId', async () => {
    await forkCommand('original-session-123', 'test prompt', {})

    expect(mockSessionService.resolveId).toHaveBeenCalledWith('original-session-123')
  })

  it('should pass resolved session ID to createRewindSession', async () => {
    await forkCommand('original-session-123', 'test prompt', {})

    expect(mockSessionService.createRewindSession).toHaveBeenCalledWith(
      'resolved-session-123',
      undefined,
      'forked-session'
    )
  })

  it('should pass resolved session ID to agentService.resume', async () => {
    await forkCommand('original-session-123', 'test prompt', {})

    expect(mockAgentService.resume).toHaveBeenCalledWith('new-session-456', 'test prompt', {
      allowedTools: ['Bash'],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: 10,
      maxContextTokens: 4000
    })
  })

  it('should verify parseForkSession receives all CLI options', async () => {
    const options = {
      name: 'my-fork',
      allowedTools: ['WebFetch'],
      model: 'claude-opus-4-5',
      maxTurns: '15'
    }

    await forkCommand('original-session-123', 'test prompt', options)

    expect(vi.mocked(parseForkSession)).toHaveBeenCalledWith(
      expect.objectContaining({
        originalSessionId: 'original-session-123',
        prompt: 'test prompt',
        name: 'my-fork',
        allowedTools: ['WebFetch'],
        model: 'claude-opus-4-5',
        maxTurns: '15'
      })
    )
  })
})

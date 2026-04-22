import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resumeCommand } from '../resume'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr, debug } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { printResponse, printStreamEvent } from '@src/cli/display'
import { parseResumeSession } from '@src/validators/cli/resumeSession'
import type { AgentStreamEvent } from '@src/types/agent'

// Mock all dependencies
vi.mock('@src/core/di/container')
vi.mock('@src/services/sessionService')
vi.mock('@src/services/agentService')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/resumeSession')

describe('resumeCommand', () => {
  const mockSessionService = {
    resolveId: vi.fn(),
    addLabels: vi.fn()
  }
  const mockAgentService = {
    resume: vi.fn()
  }
  const mockConfig = {
    display: {
      header_color: '#D97757',
      no_color: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup container.resolve mock to return services
    vi.mocked(container.resolve).mockImplementation((token: string) => {
      if (token === TOKENS.SessionService) return mockSessionService as unknown
      if (token === TOKENS.AgentService) return mockAgentService as unknown
      if (token === TOKENS.Config) return mockConfig as unknown
      throw new Error(`Unknown token: ${token}`)
    })

    // Setup default successful response
    vi.mocked(mockAgentService.resume).mockResolvedValue({
      content: 'Agent response',
      stop_reason: 'end_turn'
    })

    vi.mocked(mockSessionService.resolveId).mockResolvedValue('resolved-session-id')
    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction: 'test instruction',
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully resume a session with streaming enabled', async () => {
    const sessionId = 'session-123'
    const instruction = 'continue with task'
    const options = {}

    await resumeCommand(sessionId, instruction, options)

    expect(vi.mocked(debug.print)).toHaveBeenCalledWith('Resuming session', {
      session_id: sessionId
    })
    expect(vi.mocked(parseResumeSession)).toHaveBeenCalledWith({
      sessionId,
      instruction,
      ...options
    })
    expect(vi.mocked(mockSessionService.resolveId)).toHaveBeenCalledWith('resolved-session-id')
    expect(vi.mocked(mockAgentService.resume)).toHaveBeenCalled()
    expect(vi.mocked(printResponse)).toHaveBeenCalled()
    expect(vi.mocked(stdout.print)).toHaveBeenCalledWith(
      '\nTo resume: perclst resume resolved-session-id "<instruction>"'
    )
  })

  it('should pass streaming event handler when streaming is enabled', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = { outputOnly: false, format: 'text' }

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    const resumeCall = vi.mocked(mockAgentService.resume).mock.calls[0]
    expect(resumeCall[2].onStreamEvent).toBeDefined()
    expect(typeof resumeCall[2].onStreamEvent).toBe('function')
  })

  it('should not pass streaming event handler when outputOnly is true', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = { outputOnly: true }

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: true,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    const resumeCall = vi.mocked(mockAgentService.resume).mock.calls[0]
    expect(resumeCall[2].onStreamEvent).toBeUndefined()
  })

  it('should not pass streaming event handler when format is json', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = { format: 'json' }

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'json'
    })

    await resumeCommand(sessionId, instruction, options)

    const resumeCall = vi.mocked(mockAgentService.resume).mock.calls[0]
    expect(resumeCall[2].onStreamEvent).toBeUndefined()
  })

  it('should add labels when provided', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = { labels: ['important', 'bug-fix'] }

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: ['important', 'bug-fix'],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    expect(vi.mocked(mockSessionService.addLabels)).toHaveBeenCalledWith('resolved-session-id', [
      'important',
      'bug-fix'
    ])
  })

  it('should not add labels when none provided', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    expect(vi.mocked(mockSessionService.addLabels)).not.toHaveBeenCalled()
  })

  it('should pass correct options to agentService.resume', async () => {
    const sessionId = 'session-123'
    const instruction = 'test instruction'
    const options = {
      allowedTools: ['WebFetch', 'Bash'],
      disallowedTools: ['Write'],
      model: 'claude-opus-4-5',
      maxTurns: '10',
      maxContextTokens: '50000'
    }

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: ['WebFetch', 'Bash'],
      disallowedTools: ['Write'],
      model: 'claude-opus-4-5',
      maxTurns: 10,
      maxContextTokens: 50000,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    const resumeCall = vi.mocked(mockAgentService.resume).mock.calls[0]
    expect(resumeCall[0]).toBe('resolved-session-id')
    expect(resumeCall[1]).toBe(instruction)
    expect(resumeCall[2]).toEqual({
      allowedTools: ['WebFetch', 'Bash'],
      disallowedTools: ['Write'],
      model: 'claude-opus-4-5',
      maxTurns: 10,
      maxContextTokens: 50000,
      onStreamEvent: expect.any(Function)
    })
  })

  it('should set silentThoughts and silentToolResponse to true when streaming is enabled', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    const printResponseCall = vi.mocked(printResponse).mock.calls[0]
    expect(printResponseCall[1].silentThoughts).toBe(true)
    expect(printResponseCall[1].silentToolResponse).toBe(true)
  })

  it('should handle ValidationError by printing error message and exiting', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}
    const validationError = new ValidationError('Invalid session ID format')

    vi.mocked(parseResumeSession).mockImplementation(() => {
      throw validationError
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    await expect(resumeCommand(sessionId, instruction, options)).rejects.toThrow('exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith(
      'Invalid arguments: Invalid session ID format'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should handle RateLimitError with resetInfo by printing rate limit message', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}
    const rateLimitError = new RateLimitError('Rate limit exceeded')
    rateLimitError.resetInfo = '2026-04-23T15:30:00Z'

    vi.mocked(mockAgentService.resume).mockRejectedValue(rateLimitError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    await expect(resumeCommand(sessionId, instruction, options)).rejects.toThrow('exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith(
      'Claude usage limit reached. Resets: 2026-04-23T15:30:00Z Please wait and try again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should handle RateLimitError without resetInfo by printing rate limit message', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}
    const rateLimitError = new RateLimitError('Rate limit exceeded')
    rateLimitError.resetInfo = undefined

    vi.mocked(mockAgentService.resume).mockRejectedValue(rateLimitError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    await expect(resumeCommand(sessionId, instruction, options)).rejects.toThrow('exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith(
      'Claude usage limit reached. Please wait and try again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should handle generic Error by printing error and exiting', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}
    const genericError = new Error('Unexpected error occurred')

    vi.mocked(mockAgentService.resume).mockRejectedValue(genericError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    await expect(resumeCommand(sessionId, instruction, options)).rejects.toThrow('exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to resume session', genericError)
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should streaming event handler call printStreamEvent correctly', async () => {
    const sessionId = 'session-123'
    const instruction = 'test'
    const options = {}

    vi.mocked(parseResumeSession).mockReturnValue({
      sessionId: 'resolved-session-id',
      instruction,
      allowedTools: undefined,
      disallowedTools: undefined,
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      labels: [],
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false,
      outputOnly: false,
      format: 'text'
    })

    await resumeCommand(sessionId, instruction, options)

    const resumeCall = vi.mocked(mockAgentService.resume).mock.calls[0]
    const streamHandler = resumeCall[2].onStreamEvent

    expect(streamHandler).toBeDefined()

    // Simulate calling the stream event handler
    if (streamHandler) {
      const mockEvent: AgentStreamEvent = {
        type: 'text',
        content: 'streaming text'
      }
      streamHandler(mockEvent)

      expect(vi.mocked(printStreamEvent)).toHaveBeenCalledWith(mockEvent, mockConfig.display)
    }
  })
})

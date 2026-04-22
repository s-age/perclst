import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startCommand } from '../start'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { printResponse, printStreamEvent } from '@src/cli/display'
import type { AgentStreamEvent } from '@src/types/agent'
import type { SpyInstance } from 'vitest'

// Mock dependencies
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/startSession')
vi.mock('@src/errors/validationError')
vi.mock('@src/errors/rateLimitError')

const { parseStartSession } = await import('@src/validators/cli/startSession')

type MockAgentService = {
  start: ReturnType<typeof vi.fn>
}

type MockConfig = {
  display: {
    header_color: string
    no_color: boolean
  }
}

describe('startCommand', () => {
  let mockAgentService: MockAgentService
  let mockConfig: MockConfig
  let mockParseStartSessionFn: ReturnType<typeof vi.fn>
  let exitSpy: SpyInstance

  beforeEach(() => {
    // Setup mock AgentService
    mockAgentService = {
      start: vi.fn()
    }

    // Setup mock Config
    mockConfig = {
      display: {
        header_color: '#D97757',
        no_color: false
      }
    }

    // Setup container mock
    vi.mocked(container).resolve = vi.fn((token: string) => {
      if (token === TOKENS.AgentService) return mockAgentService
      if (token === TOKENS.Config) return mockConfig
      return undefined
    })

    // Setup output mocks
    vi.mocked(debug).print = vi.fn()
    vi.mocked(stdout).print = vi.fn()
    vi.mocked(stderr).print = vi.fn()
    vi.mocked(printStreamEvent).mockClear()
    vi.mocked(printResponse).mockClear()

    // Setup validator mock
    mockParseStartSessionFn = vi.fn()
    // eslint-disable-next-line local/no-any
    vi.mocked(parseStartSession as any).mockImplementation(mockParseStartSessionFn)

    // Spy on process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    exitSpy.mockRestore()
  })

  it('successful session start with streaming disabled (outputOnly=true)', async () => {
    const mockSessionId = 'session-123'
    const mockResponse = { result: 'success' }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: true,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', { outputOnly: true })

    expect(debug.print).toHaveBeenCalledWith('Starting new agent session')
    expect(mockAgentService.start).toHaveBeenCalledWith(
      'test task',
      {
        name: 'test-session',
        procedure: undefined,
        labels: [],
        working_dir: process.cwd()
      },
      {
        allowedTools: [],
        disallowedTools: [],
        model: 'claude-sonnet-4-6',
        maxTurns: undefined,
        maxContextTokens: undefined,
        onStreamEvent: undefined
      }
    )
    expect(stdout.print).toHaveBeenCalledWith(`Session created: ${mockSessionId}`)
    expect(printResponse).toHaveBeenCalled()
    expect(stdout.print).toHaveBeenCalledWith(
      `\nTo resume: perclst resume ${mockSessionId} "<instruction>"`
    )
  })

  it('successful session start with streaming enabled', async () => {
    const mockSessionId = 'session-456'
    const mockResponse = { result: 'success' }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', {})

    expect(mockAgentService.start).toHaveBeenCalled()
    const agentOptions = mockAgentService.start.mock.calls[0][2]
    expect(agentOptions.onStreamEvent).toBeDefined()
    expect(typeof agentOptions.onStreamEvent).toBe('function')
  })

  it('disables streaming when format is json', async () => {
    const mockSessionId = 'session-789'
    const mockResponse = { result: 'success' }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'json',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', { format: 'json' })

    const agentOptions = mockAgentService.start.mock.calls[0][2]
    expect(agentOptions.onStreamEvent).toBeUndefined()
  })

  it('calls stream event callback with event and config when streaming enabled', async () => {
    const mockSessionId = 'session-stream'
    const mockResponse = { result: 'success' }
    const mockStreamEvent: AgentStreamEvent = {
      type: 'agent_message',
      message: 'Test message',
      timestamp: new Date()
    }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    let capturedCallback: ((event: AgentStreamEvent) => void) | undefined
    mockAgentService.start.mockImplementation(
      async (
        task: string,
        sessionOptions: Record<string, unknown>,
        agentOptions: Record<string, unknown>
      ) => {
        capturedCallback = agentOptions.onStreamEvent as
          | ((event: AgentStreamEvent) => void)
          | undefined
        return {
          sessionId: mockSessionId,
          response: mockResponse
        }
      }
    )

    await startCommand('test task', {})

    capturedCallback?.(mockStreamEvent)
    expect(printStreamEvent).toHaveBeenCalledWith(mockStreamEvent, mockConfig.display)
  })

  it('passes all parsed options to agentService.start', async () => {
    const mockSessionId = 'session-options'
    const mockResponse = { result: 'success' }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'my-session',
      procedure: 'plan-feature',
      labels: ['important', 'bug-fix'],
      allowedTools: ['WebFetch', 'Bash'],
      disallowedTools: ['Write'],
      model: 'claude-opus-4-5',
      maxTurns: '10',
      maxContextTokens: '100000',
      outputOnly: true,
      format: 'text',
      silentThoughts: true,
      silentToolResponse: true,
      silentUsage: true
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', {
      name: 'my-session',
      procedure: 'plan-feature',
      labels: ['important', 'bug-fix'],
      allowedTools: ['WebFetch', 'Bash'],
      disallowedTools: ['Write'],
      model: 'claude-opus-4-5',
      maxTurns: '10',
      maxContextTokens: '100000'
    })

    expect(mockAgentService.start).toHaveBeenCalledWith(
      'test task',
      {
        name: 'my-session',
        procedure: 'plan-feature',
        labels: ['important', 'bug-fix'],
        working_dir: process.cwd()
      },
      {
        allowedTools: ['WebFetch', 'Bash'],
        disallowedTools: ['Write'],
        model: 'claude-opus-4-5',
        maxTurns: '10',
        maxContextTokens: '100000',
        onStreamEvent: undefined
      }
    )
  })

  it('passes correct display options to printResponse', async () => {
    const mockSessionId = 'session-display'
    const mockResponse = { result: 'success' }

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', {})

    expect(printResponse).toHaveBeenCalledWith(
      mockResponse,
      {
        task: 'test task',
        name: 'test-session',
        procedure: undefined,
        labels: [],
        allowedTools: [],
        disallowedTools: [],
        model: 'claude-sonnet-4-6',
        maxTurns: undefined,
        maxContextTokens: undefined,
        outputOnly: false,
        format: 'text',
        silentThoughts: true, // streaming forces this to true
        silentToolResponse: true, // streaming forces this to true
        silentUsage: false
      },
      mockConfig.display,
      { sessionId: mockSessionId }
    )
  })

  it('handles RateLimitError without resetInfo', async () => {
    const rateLimitError = new RateLimitError('Rate limited')
    rateLimitError.resetInfo = undefined

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockImplementation(async () => {
      throw rateLimitError
    })

    try {
      await startCommand('test task', {})
    } catch {
      // Expected to throw from process.exit mock
    }

    expect(stderr.print).toHaveBeenCalledWith(
      'Claude usage limit reached. Please wait and try again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('handles RateLimitError with resetInfo', async () => {
    const rateLimitError = new RateLimitError('Rate limited')
    rateLimitError.resetInfo = '2026-04-23T15:30:00Z'

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockImplementation(async () => {
      throw rateLimitError
    })

    try {
      await startCommand('test task', {})
    } catch {
      // Expected to throw from process.exit mock
    }

    expect(stderr.print).toHaveBeenCalledWith(
      'Claude usage limit reached. Resets: 2026-04-23T15:30:00Z Please wait and try again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('handles generic Error', async () => {
    const genericError = new Error('Something went wrong')

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockImplementation(async () => {
      throw genericError
    })

    try {
      await startCommand('test task', {})
    } catch {
      // Expected to throw from process.exit mock
    }

    expect(stderr.print).toHaveBeenCalledWith('Failed to start session', genericError)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('includes working directory in session options', async () => {
    const mockSessionId = 'session-cwd'
    const mockResponse = { result: 'success' }
    const originalCwd = process.cwd()

    mockParseStartSessionFn.mockReturnValue({
      task: 'test task',
      name: 'test-session',
      procedure: undefined,
      labels: [],
      allowedTools: [],
      disallowedTools: [],
      model: 'claude-sonnet-4-6',
      maxTurns: undefined,
      maxContextTokens: undefined,
      outputOnly: false,
      format: 'text',
      silentThoughts: false,
      silentToolResponse: false,
      silentUsage: false
    })

    mockAgentService.start.mockResolvedValue({
      sessionId: mockSessionId,
      response: mockResponse
    })

    await startCommand('test task', {})

    const sessionOptions = mockAgentService.start.mock.calls[0][1]
    expect(sessionOptions.working_dir).toBe(originalCwd)
  })
})

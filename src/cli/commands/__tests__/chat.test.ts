import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chatCommand } from '../chat'

vi.mock('@src/core/di/container')
vi.mock('@src/validators/cli/chatSession')
vi.mock('@src/utils/output')
vi.mock('@src/cli/prompt')

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { parseChatSession } from '@src/validators/cli/chatSession'
import { ValidationError } from '@src/errors/validationError'
import { stderr } from '@src/utils/output'
import { handleWorkingDirMismatch } from '@src/cli/prompt'

describe('chatCommand', () => {
  const mockSessionService = {
    resolveId: vi.fn(),
    get: vi.fn()
  }
  const mockAgentService = {
    chat: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.SessionService) return mockSessionService
      if (token === TOKENS.AgentService) return mockAgentService
      throw new Error(`Unexpected token: ${String(token)}`)
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.get.mockResolvedValue({ working_dir: process.cwd() })
    mockAgentService.chat.mockResolvedValue(undefined)
    vi.mocked(parseChatSession).mockReturnValue({
      sessionId: 'test-session',
      model: undefined,
      effort: undefined
    })
    vi.mocked(handleWorkingDirMismatch).mockResolvedValue(undefined)
  })

  it('resolves the session ID and delegates to agentService.chat', async () => {
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    vi.mocked(parseChatSession).mockReturnValue({ sessionId, model: undefined, effort: undefined })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)

    await chatCommand(sessionId)

    expect(mockSessionService.resolveId).toHaveBeenCalledWith(sessionId)
    expect(mockAgentService.chat).toHaveBeenCalledWith(resolvedId, {
      model: undefined,
      effort: undefined
    })
  })

  it('resolves TOKENS.SessionService from container', async () => {
    await chatCommand('test-session')

    expect(vi.mocked(container.resolve)).toHaveBeenCalledWith(TOKENS.SessionService)
  })

  it('resolves TOKENS.AgentService from container', async () => {
    await chatCommand('test-session')

    expect(vi.mocked(container.resolve)).toHaveBeenCalledWith(TOKENS.AgentService)
  })

  it('prints validation error and exits when parseChatSession throws ValidationError', async () => {
    const validationError = new ValidationError('Invalid session ID format')
    vi.mocked(parseChatSession).mockImplementation(() => {
      throw validationError
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await chatCommand('invalid')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      'Invalid arguments: Invalid session ID format'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('prints generic error and exits when resolveId throws', async () => {
    const runtimeError = new Error('Session not found')
    mockSessionService.resolveId.mockRejectedValue(runtimeError)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await chatCommand('test-session')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      'Failed to start chat session',
      runtimeError
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('prints generic error and exits when agentService.chat throws', async () => {
    const chatError = new Error('Chat failed')
    mockAgentService.chat.mockRejectedValue(chatError)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await chatCommand('test-session')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to start chat session', chatError)
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})

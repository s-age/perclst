import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chatCommand } from '../chat'

// Mock imports
vi.mock('child_process')
vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')
vi.mock('@src/validators/cli/chatSession')
vi.mock('@src/utils/output')

import { spawnSync } from 'child_process'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { parseChatSession } from '@src/validators/cli/chatSession'
import { ValidationError } from '@src/errors/validationError'
import { stderr } from '@src/utils/output'

describe('chatCommand', () => {
  const mockSessionService = {
    resolveId: vi.fn(),
    get: vi.fn(),
    save: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(container.resolve).mockReturnValue(mockSessionService)
    vi.mocked(spawnSync).mockReturnValue({ status: 0 })
  })

  it('should spawn claude with --resume when session has no fork source', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: undefined,
      rewind_to_message_id: undefined
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(spawnSync).toHaveBeenCalledWith('claude', ['--resume', 'claude-session-789'], {
      stdio: 'inherit'
    })
  })

  it('should spawn claude with --fork-session when session has rewind source', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: 'source-session-999',
      rewind_to_message_id: undefined
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(spawnSync).toHaveBeenCalledWith(
      'claude',
      ['--resume', 'source-session-999', '--fork-session', '--session-id', 'claude-session-789'],
      {
        stdio: 'inherit'
      }
    )
  })

  it('should include --resume-session-at when fork has rewind_to_message_id', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: 'source-session-999',
      rewind_to_message_id: 'message-123'
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(spawnSync).toHaveBeenCalledWith(
      'claude',
      [
        '--resume',
        'source-session-999',
        '--fork-session',
        '--session-id',
        'claude-session-789',
        '--resume-session-at',
        'message-123'
      ],
      {
        stdio: 'inherit'
      }
    )
  })

  it('should clear rewind fields after fork', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: 'source-session-999',
      rewind_to_message_id: 'message-123'
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(session.rewind_source_claude_session_id).toBeUndefined()
    expect(session.rewind_to_message_id).toBeUndefined()
    expect(mockSessionService.save).toHaveBeenCalledWith(session)
  })

  it('should not save session when there is no fork', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: undefined,
      rewind_to_message_id: undefined
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(mockSessionService.save).not.toHaveBeenCalled()
  })

  it('should handle ValidationError and exit with code 1', async () => {
    // Arrange
    const sessionId = 'invalid'
    const validationError = new ValidationError('Invalid session ID format')
    parseChatSession.mockImplementation(() => {
      throw validationError
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(stderr.print).toHaveBeenCalledWith('Invalid arguments: Invalid session ID format')
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should handle other errors and exit with code 1', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const runtimeError = new Error('Session not found')
    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockRejectedValue(runtimeError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(stderr.print).toHaveBeenCalledWith('Failed to start chat session', runtimeError)
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('should resolve session ID before fetching session', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: undefined,
      rewind_to_message_id: undefined
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(mockSessionService.resolveId).toHaveBeenCalledWith(sessionId)
    expect(mockSessionService.get).toHaveBeenCalledWith(resolvedId)
  })

  it('should call container.resolve with SessionService token', async () => {
    // Arrange
    const sessionId = 'test-session-123'
    const resolvedId = 'resolved-id-456'
    const session = {
      id: resolvedId,
      claude_session_id: 'claude-session-789',
      rewind_source_claude_session_id: undefined,
      rewind_to_message_id: undefined
    }

    parseChatSession.mockReturnValue({ sessionId })
    mockSessionService.resolveId.mockResolvedValue(resolvedId)
    mockSessionService.get.mockResolvedValue(session)

    // Act
    await chatCommand(sessionId)

    // Assert
    expect(container.resolve).toHaveBeenCalledWith(TOKENS.SessionService)
  })
})

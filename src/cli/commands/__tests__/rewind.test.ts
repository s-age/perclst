import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rewindCommand } from '../rewind'

// Mock dependencies
vi.mock('@src/core/di/container')
vi.mock('@src/services/analyzeService')
vi.mock('@src/services/sessionService')
vi.mock('@src/utils/output')
vi.mock('@src/validators/cli/rewindSession')

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { parseRewindSession } from '@src/validators/cli/rewindSession'

describe('rewindCommand', (): void => {
  let mockAnalyzeService: ReturnType<typeof vi.fn>
  let mockSessionService: ReturnType<typeof vi.fn>
  let mockParseRewindSession: ReturnType<typeof vi.fn>
  let mockContainerResolve: ReturnType<typeof vi.fn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  const setupMockContainer = (): void => {
    mockContainerResolve.mockImplementation((token: string) => {
      if (token === TOKENS.SessionService) return mockSessionService
      if (token === TOKENS.AnalyzeService) return mockAnalyzeService
    })
  }

  beforeEach((): void => {
    vi.clearAllMocks()

    mockAnalyzeService = {
      getRewindTurns: vi.fn(),
      resolveTurnByIndex: vi.fn()
    }

    mockSessionService = {
      resolveId: vi.fn(),
      createRewindSession: vi.fn()
    }

    mockParseRewindSession = vi.fn()
    mockContainerResolve = vi.fn()

    vi.mocked(container).resolve = mockContainerResolve
    vi.mocked(parseRewindSession).mockImplementation(mockParseRewindSession)

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number) => {
      throw new Error(`process.exit(${code})`)
    })
  })

  afterEach((): void => {
    exitSpy.mockRestore()
  })

  describe('list mode', (): void => {
    it('should call handleListMode and return when list option is true', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('session-1', undefined, { list: true })

      expect(mockParseRewindSession).toHaveBeenCalledWith({
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: undefined
      })
      expect(mockSessionService.resolveId).toHaveBeenCalledWith('session-1')
      expect(mockAnalyzeService.getRewindTurns).toHaveBeenCalledWith('resolved-id')
    })

    it('should print "No assistant turns found." when no turns exist', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('session-1', undefined, { list: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No assistant turns found.')
    })

    it('should print turns with truncation when text exceeds display length', async (): Promise<void> => {
      const turns = [
        { index: 0, text: 'Short message' },
        { index: 1, text: 'A'.repeat(150) }
      ]
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue(turns)

      await rewindCommand('session-1', undefined, { list: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('  0: Short message')
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`  1: ${turns[1].text.slice(0, 120)}…`)
    })
  })

  describe('rewind to index mode', (): void => {
    it('should create rewind session and print success message when index is valid', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: 5,
        list: false,
        length: 120
      }
      const newSession = { id: 'rewind-session-id' }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.resolveTurnByIndex.mockResolvedValue('message-id-123')
      mockSessionService.createRewindSession.mockResolvedValue(newSession)

      await rewindCommand('session-1', '5', {})

      expect(mockAnalyzeService.resolveTurnByIndex).toHaveBeenCalledWith('resolved-id', 5)
      expect(mockSessionService.createRewindSession).toHaveBeenCalledWith(
        'resolved-id',
        'message-id-123'
      )
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        '\nRewind session created: rewind-session-id'
      )
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        'To continue: perclst resume rewind-session-id "<instruction>"'
      )
    })

    it('should exit with error when index argument is missing and list is not set', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: false,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')

      try {
        await rewindCommand('session-1', undefined, {})
      } catch {
        // process.exit throws in our spy
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Either --list or an index argument is required'
      )
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('error handling', (): void => {
    it('should catch ValidationError and print error message', async (): Promise<void> => {
      const validationError = new ValidationError('Invalid session ID')
      mockParseRewindSession.mockImplementation(() => {
        throw validationError
      })

      try {
        await rewindCommand('invalid', '0', {})
      } catch {
        // process.exit throws
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        `Invalid arguments: ${validationError.message}`
      )
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should catch RangeError and print error message', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: 999,
        list: false,
        length: 120
      }
      const rangeError = new RangeError('Index out of range')
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.resolveTurnByIndex.mockRejectedValue(rangeError)

      try {
        await rewindCommand('session-1', '999', {})
      } catch {
        // process.exit throws
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(rangeError.message)
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should catch generic Error and print generic failure message', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: 5,
        list: false,
        length: 120
      }
      const genericError = new Error('Unknown error')
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.resolveTurnByIndex.mockRejectedValue(genericError)

      try {
        await rewindCommand('session-1', '5', {})
      } catch {
        // process.exit throws
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to rewind session', genericError)
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('dependency resolution', (): void => {
    it('should resolve SessionService from container', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('session-1', undefined, { list: true })

      expect(mockContainerResolve).toHaveBeenCalledWith(TOKENS.SessionService)
    })

    it('should resolve AnalyzeService from container', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('session-1', undefined, { list: true })

      expect(mockContainerResolve).toHaveBeenCalledWith(TOKENS.AnalyzeService)
    })

    it('should resolve session ID using session service', async (): Promise<void> => {
      const input = {
        sessionId: 'short-id',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('full-resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('short-id', undefined, { list: true })

      expect(mockSessionService.resolveId).toHaveBeenCalledWith('short-id')
    })
  })

  describe('input validation', (): void => {
    it('should pass sessionId, index, and options to parseRewindSession', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: 5,
        list: false,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.resolveTurnByIndex.mockResolvedValue('msg-id')
      mockSessionService.createRewindSession.mockResolvedValue({ id: 'rewind-id' })

      await rewindCommand('session-1', '5', { length: '50' })

      expect(mockParseRewindSession).toHaveBeenCalledWith({
        sessionId: 'session-1',
        index: '5',
        list: undefined,
        length: '50'
      })
    })

    it('should handle undefined sessionId in parseRewindSession call', async (): Promise<void> => {
      mockParseRewindSession.mockImplementation(() => {
        throw new ValidationError('Session ID is required')
      })

      try {
        await rewindCommand(undefined, '5', {})
      } catch {
        // process.exit throws
      }

      expect(mockParseRewindSession).toHaveBeenCalledWith({
        sessionId: undefined,
        index: '5',
        list: undefined,
        length: undefined
      })
    })

    it('should handle undefined indexStr in parseRewindSession call', async (): Promise<void> => {
      const input = {
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: 120
      }
      mockParseRewindSession.mockReturnValue(input)
      setupMockContainer()
      mockSessionService.resolveId.mockResolvedValue('resolved-id')
      mockAnalyzeService.getRewindTurns.mockResolvedValue([])

      await rewindCommand('session-1', undefined, { list: true })

      expect(mockParseRewindSession).toHaveBeenCalledWith({
        sessionId: 'session-1',
        index: undefined,
        list: true,
        length: undefined
      })
    })
  })
})

describe('handleListMode (internal function via rewindCommand)', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('should display turns with proper indexing and formatting when list contains multiple turns', async (): Promise<void> => {
    const turns = [
      { index: 0, text: 'First response' },
      { index: 1, text: 'Second response' },
      { index: 2, text: 'A'.repeat(200) }
    ]
    const input = {
      sessionId: 'session-1',
      index: undefined,
      list: true,
      length: 100
    }

    vi.mocked(container).resolve = vi.fn((token: string) => {
      if (token === TOKENS.SessionService) {
        return {
          resolveId: vi.fn().mockResolvedValue('resolved-id'),
          createRewindSession: vi.fn()
        }
      }
      if (token === TOKENS.AnalyzeService) {
        return { getRewindTurns: vi.fn().mockResolvedValue(turns) }
      }
    })

    vi.mocked(parseRewindSession).mockReturnValue(input)

    await rewindCommand('session-1', undefined, { list: true })

    expect(vi.mocked(stdout).print).toHaveBeenCalledWith('  0: First response')
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith('  1: Second response')
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`  2: ${'A'.repeat(100)}…`)
  })

  it('should respect custom display length from parsed input', async (): Promise<void> => {
    const longText = 'B'.repeat(300)
    const turns = [{ index: 0, text: longText }]
    const input = {
      sessionId: 'session-1',
      index: undefined,
      list: true,
      length: 50
    }

    vi.mocked(container).resolve = vi.fn((token: string) => {
      if (token === TOKENS.SessionService) {
        return {
          resolveId: vi.fn().mockResolvedValue('resolved-id'),
          createRewindSession: vi.fn()
        }
      }
      if (token === TOKENS.AnalyzeService) {
        return { getRewindTurns: vi.fn().mockResolvedValue(turns) }
      }
    })

    vi.mocked(parseRewindSession).mockReturnValue(input)

    await rewindCommand('session-1', undefined, { list: true, length: '50' })

    expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`  0: ${'B'.repeat(50)}…`)
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { tagCommand } from '../tag'

// Mock all dependencies at module level
vi.mock('@src/validators/cli/tagSession', () => ({
  parseTagSession: vi.fn()
}))

vi.mock('@src/core/di/container', () => ({
  container: {
    resolve: vi.fn()
  }
}))

vi.mock('@src/utils/output', () => ({
  stdout: {
    print: vi.fn()
  },
  stderr: {
    print: vi.fn()
  }
}))

// Import mocked modules after vi.mock()
import { parseTagSession } from '@src/validators/cli/tagSession'
import { container } from '@src/core/di/container'
import { stdout, stderr } from '@src/utils/output'

describe('tagCommand', () => {
  const mockSessionId = 'session-123'
  const mockLabels = ['important', 'review']
  const mockResolvedId = 'resolved-id-456'

  const mockSessionService = {
    resolveId: vi.fn(),
    setLabels: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  function setupSuccessfulMocks(overrides?: {
    sessionId?: string
    labels?: string[]
    resolvedId?: string
  }) {
    const sessionId = overrides?.sessionId ?? mockSessionId
    const labels = overrides?.labels ?? mockLabels
    const resolvedId = overrides?.resolvedId ?? mockResolvedId

    vi.mocked(parseTagSession).mockReturnValue({ sessionId, labels })
    vi.mocked(container.resolve).mockReturnValue(mockSessionService)
    vi.mocked(mockSessionService.resolveId).mockResolvedValue(resolvedId)
    vi.mocked(mockSessionService.setLabels).mockResolvedValue({
      id: resolvedId,
      metadata: { labels }
    })
  }

  function setupParseFailure(error: Error) {
    vi.mocked(parseTagSession).mockImplementation(() => {
      throw error
    })
  }

  function setupResolveFailure(error: Error) {
    const parsedInput = { sessionId: mockSessionId, labels: mockLabels }
    vi.mocked(parseTagSession).mockReturnValue(parsedInput)
    vi.mocked(container.resolve).mockReturnValue(mockSessionService)
    vi.mocked(mockSessionService.resolveId).mockRejectedValue(error)
  }

  function setupSetLabelsFailure(error: Error) {
    const parsedInput = { sessionId: mockSessionId, labels: mockLabels }
    vi.mocked(parseTagSession).mockReturnValue(parsedInput)
    vi.mocked(container.resolve).mockReturnValue(mockSessionService)
    vi.mocked(mockSessionService.resolveId).mockResolvedValue(mockResolvedId)
    vi.mocked(mockSessionService.setLabels).mockRejectedValue(error)
  }

  describe('happy path', () => {
    it('should parse session input', async () => {
      setupSuccessfulMocks()

      await tagCommand(mockSessionId, mockLabels)

      expect(parseTagSession).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        labels: mockLabels
      })
    })

    it('should resolve session ID', async () => {
      setupSuccessfulMocks()

      await tagCommand(mockSessionId, mockLabels)

      expect(mockSessionService.resolveId).toHaveBeenCalledWith(mockSessionId)
    })

    it('should set labels on resolved session', async () => {
      setupSuccessfulMocks()

      await tagCommand(mockSessionId, mockLabels)

      expect(mockSessionService.setLabels).toHaveBeenCalledWith(mockResolvedId, mockLabels)
    })

    it('should print success message with session ID', async () => {
      setupSuccessfulMocks()

      await tagCommand(mockSessionId, mockLabels)

      expect(stdout.print).toHaveBeenCalledWith(`Labels set: ${mockResolvedId}`)
    })

    it('should print labels in success message', async () => {
      const customLabels = ['tag1', 'tag2', 'tag3']
      setupSuccessfulMocks({ labels: customLabels })

      await tagCommand(mockSessionId, customLabels)

      expect(stdout.print).toHaveBeenCalledWith(`  Labels: ${customLabels.join(', ')}`)
    })

    it('should handle empty labels list', async () => {
      const emptyLabels: string[] = []
      setupSuccessfulMocks({ labels: emptyLabels })

      await tagCommand(mockSessionId, emptyLabels)

      expect(mockSessionService.setLabels).toHaveBeenCalledWith(mockResolvedId, emptyLabels)
    })
  })

  describe('error handling', () => {
    it('should call stderr when validation fails', async () => {
      const validationError = new Error('Invalid session ID format')
      setupParseFailure(validationError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(stderr.print).toHaveBeenCalledWith('Failed to set labels', validationError)
    })

    it('should exit with code 1 when validation fails', async () => {
      const validationError = new Error('Invalid session ID format')
      setupParseFailure(validationError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should call stderr when resolveId fails', async () => {
      const resolveError = new Error('Session not found')
      setupResolveFailure(resolveError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(stderr.print).toHaveBeenCalledWith('Failed to set labels', resolveError)
    })

    it('should exit with code 1 when resolveId fails', async () => {
      const resolveError = new Error('Session not found')
      setupResolveFailure(resolveError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should call stderr when setLabels fails', async () => {
      const setLabelsError = new Error('Failed to update session')
      setupSetLabelsFailure(setLabelsError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(stderr.print).toHaveBeenCalledWith('Failed to set labels', setLabelsError)
    })

    it('should exit with code 1 when setLabels fails', async () => {
      const setLabelsError = new Error('Failed to update session')
      setupSetLabelsFailure(setLabelsError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should not call stdout when error occurs', async () => {
      const validationError = new Error('Invalid input')
      setupParseFailure(validationError)

      try {
        await tagCommand(mockSessionId, mockLabels)
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(stdout.print).not.toHaveBeenCalled()
    })
  })
})

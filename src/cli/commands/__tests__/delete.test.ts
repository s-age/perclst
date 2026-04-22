import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock imports
vi.mock('@src/validators/cli/deleteSession')
vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')
vi.mock('@src/utils/output')

import { deleteCommand } from '../delete'
import { parseDeleteSession } from '@src/validators/cli/deleteSession'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'

describe('deleteCommand', () => {
  const mockSessionId = 'test-session-id'
  const mockResolvedId = 'resolved-session-id'

  const mockSessionService = {
    resolveId: vi.fn(),
    delete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.exit = vi.fn() as never

    // Setup default mock implementations
    vi.mocked(parseDeleteSession).mockReturnValue({
      sessionId: mockSessionId
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockSessionService)
    vi.mocked(mockSessionService.resolveId).mockResolvedValue(mockResolvedId)
    vi.mocked(mockSessionService.delete).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delete session and print success message on happy path', async () => {
    await deleteCommand(mockSessionId)

    expect(parseDeleteSession).toHaveBeenCalledWith({ sessionId: mockSessionId })
    expect(container.resolve).toHaveBeenCalledWith(TOKENS.SessionService)
    expect(mockSessionService.resolveId).toHaveBeenCalledWith(mockSessionId)
    expect(mockSessionService.delete).toHaveBeenCalledWith(mockResolvedId)
    expect(stdout.print).toHaveBeenCalledWith(`Session deleted: ${mockResolvedId}`)
  })

  it('should not call process.exit on successful deletion', async () => {
    await deleteCommand(mockSessionId)

    expect(process.exit).not.toHaveBeenCalled()
  })

  it('should handle validation error from parseDeleteSession', async () => {
    const validationError = new Error('Invalid session ID')
    vi.mocked(parseDeleteSession).mockImplementation(() => {
      throw validationError
    })

    await deleteCommand(mockSessionId)

    expect(stderr.print).toHaveBeenCalledWith('Failed to delete session', validationError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle error from sessionService.resolveId', async () => {
    const resolveError = new Error('Session not found')
    vi.mocked(mockSessionService.resolveId).mockRejectedValue(resolveError)

    await deleteCommand(mockSessionId)

    expect(stderr.print).toHaveBeenCalledWith('Failed to delete session', resolveError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle error from sessionService.delete', async () => {
    const deleteError = new Error('Failed to delete session files')
    vi.mocked(mockSessionService.delete).mockRejectedValue(deleteError)

    await deleteCommand(mockSessionId)

    expect(stderr.print).toHaveBeenCalledWith('Failed to delete session', deleteError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should not call delete if resolveId fails', async () => {
    vi.mocked(mockSessionService.resolveId).mockRejectedValue(new Error('Not found'))

    await deleteCommand(mockSessionId)

    expect(mockSessionService.delete).not.toHaveBeenCalled()
  })

  it('should not print success message if an error occurs', async () => {
    vi.mocked(mockSessionService.delete).mockRejectedValue(new Error('Delete failed'))

    await deleteCommand(mockSessionId)

    expect(stdout.print).not.toHaveBeenCalled()
  })
})

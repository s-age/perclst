import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renameCommand } from '../rename'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseRenameSession } from '@src/validators/cli/renameSession'

vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')
vi.mock('@src/services/sessionService')
vi.mock('@src/utils/output')
vi.mock('@src/validators/cli/renameSession')

describe('renameCommand', () => {
  let mockSessionService: {
    resolveId: ReturnType<typeof vi.fn>
    rename: ReturnType<typeof vi.fn>
    setLabels: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSessionService = {
      resolveId: vi.fn(),
      rename: vi.fn(),
      setLabels: vi.fn()
    }

    vi.mocked(container).resolve.mockReturnValue(mockSessionService as unknown as SessionService)

    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit')
    })
  })

  it('renames session with valid input and no labels', async () => {
    const mockSession = {
      id: 'resolved-id',
      name: 'New Session Name',
      metadata: { labels: [] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'New Session Name'
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'New Session Name', {})

    expect(vi.mocked(parseRenameSession)).toHaveBeenCalledWith({
      sessionId: 'session-123',
      name: 'New Session Name'
    })
    expect(mockSessionService.resolveId).toHaveBeenCalledWith('session-123')
    expect(mockSessionService.rename).toHaveBeenCalledWith('resolved-id', 'New Session Name')
    expect(mockSessionService.setLabels).not.toHaveBeenCalled()
    expect(vi.mocked(stdout.print)).toHaveBeenCalledWith('Session renamed: resolved-id')
    expect(vi.mocked(stdout.print)).toHaveBeenCalledWith('  Name: New Session Name')
  })

  it('renames session and sets labels when provided', async () => {
    const mockSession = {
      id: 'resolved-id',
      name: 'New Session Name',
      metadata: { labels: ['important', 'production'] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'New Session Name',
      labels: ['important', 'production']
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue(mockSession)
    mockSessionService.setLabels.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'New Session Name', {
      labels: ['important', 'production']
    })

    expect(mockSessionService.rename).toHaveBeenCalledWith('resolved-id', 'New Session Name')
    expect(mockSessionService.setLabels).toHaveBeenCalledWith('resolved-id', [
      'important',
      'production'
    ])
    expect(vi.mocked(stdout.print)).toHaveBeenCalledWith('  Labels: important, production')
  })

  it('does not print labels when labels array is empty', async () => {
    const mockSession = {
      id: 'resolved-id',
      name: 'New Session Name',
      metadata: { labels: [] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'New Session Name',
      labels: []
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue(mockSession)
    mockSessionService.setLabels.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'New Session Name', { labels: [] })

    expect(mockSessionService.setLabels).toHaveBeenCalledWith('resolved-id', [])
    expect(vi.mocked(stdout.print)).not.toHaveBeenCalledWith(expect.stringContaining('Labels:'))
  })

  it('resolves session container with SessionService token', async () => {
    const mockSession = {
      id: 'resolved-id',
      name: 'Renamed',
      metadata: { labels: [] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'Renamed'
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'Renamed', {})

    expect(vi.mocked(container).resolve).toHaveBeenCalledWith(TOKENS.SessionService)
  })

  it('catches validation error from parseRenameSession and exits', async () => {
    const validationError = new Error('Validation failed')

    vi.mocked(parseRenameSession).mockImplementation(() => {
      throw validationError
    })

    await expect(renameCommand('', '', {})).rejects.toThrow('process.exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith(
      'Failed to rename session',
      validationError
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('catches resolveId error and exits', async () => {
    const resolveError = new Error('Session not found')

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'invalid-id',
      name: 'New Name'
    })

    mockSessionService.resolveId.mockRejectedValue(resolveError)

    await expect(renameCommand('invalid-id', 'New Name', {})).rejects.toThrow('process.exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to rename session', resolveError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('catches rename error and exits', async () => {
    const renameError = new Error('Failed to update session')

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'New Name'
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockRejectedValue(renameError)

    await expect(renameCommand('session-123', 'New Name', {})).rejects.toThrow('process.exit')

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to rename session', renameError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('catches setLabels error and exits', async () => {
    const setLabelsError = new Error('Failed to set labels')

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'New Name',
      labels: ['test']
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue({
      id: 'resolved-id',
      name: 'New Name',
      metadata: { labels: [] }
    })
    mockSessionService.setLabels.mockRejectedValue(setLabelsError)

    await expect(renameCommand('session-123', 'New Name', { labels: ['test'] })).rejects.toThrow(
      'process.exit'
    )

    expect(vi.mocked(stderr.print)).toHaveBeenCalledWith('Failed to rename session', setLabelsError)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('prints session ID and name in success output', async () => {
    const mockSession = {
      id: 'abc-def-ghi',
      name: 'Important Session',
      metadata: { labels: [] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'Important Session'
    })

    mockSessionService.resolveId.mockResolvedValue('abc-def-ghi')
    mockSessionService.rename.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'Important Session', {})

    expect(vi.mocked(stdout.print)).toHaveBeenNthCalledWith(1, 'Session renamed: abc-def-ghi')
    expect(vi.mocked(stdout.print)).toHaveBeenNthCalledWith(2, '  Name: Important Session')
  })

  it('prints multiple labels comma-separated', async () => {
    const mockSession = {
      id: 'resolved-id',
      name: 'Session',
      metadata: { labels: ['prod', 'critical', 'archived'] }
    }

    vi.mocked(parseRenameSession).mockReturnValue({
      sessionId: 'session-123',
      name: 'Session',
      labels: ['prod', 'critical', 'archived']
    })

    mockSessionService.resolveId.mockResolvedValue('resolved-id')
    mockSessionService.rename.mockResolvedValue(mockSession)
    mockSessionService.setLabels.mockResolvedValue(mockSession)

    await renameCommand('session-123', 'Session', {
      labels: ['prod', 'critical', 'archived']
    })

    expect(vi.mocked(stdout.print)).toHaveBeenCalledWith('  Labels: prod, critical, archived')
  })
})

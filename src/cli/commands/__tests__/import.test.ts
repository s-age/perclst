import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { importCommand } from '../import'

vi.mock('@src/validators/cli/importSession')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')

import { parseImportSession } from '@src/validators/cli/importSession'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'

describe('importCommand', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('should import session and print all details when session has name', async () => {
    // Setup
    const mockSession = {
      id: 'session-123',
      claude_session_id: 'claude-456',
      working_dir: '/path/to/dir',
      name: 'my-session'
    }

    const mockImportService = {
      import: vi.fn().mockResolvedValue(mockSession),
      findByName: vi.fn().mockResolvedValue(null)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-456',
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act
    await importCommand('claude-456', {
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })

    // Assert — verify parseImportSession was called with merged options
    expect(vi.mocked(parseImportSession)).toHaveBeenCalledWith({
      claudeSessionId: 'claude-456',
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })
  })

  it('should call importService.import with parsed input', async () => {
    // Setup
    const mockSession = {
      id: 'session-123',
      claude_session_id: 'claude-456',
      working_dir: '/path/to/dir',
      name: 'my-session'
    }

    const mockImportService = {
      import: vi.fn().mockResolvedValue(mockSession),
      findByName: vi.fn().mockResolvedValue(null)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-456',
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act
    await importCommand('claude-456', {
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })

    // Assert — verify import service was called with correct params
    expect(mockImportService.import).toHaveBeenCalledWith('claude-456', {
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: ['label1']
    })
  })

  it('should print session details to stdout including name', async () => {
    // Setup
    const mockSession = {
      id: 'session-123',
      claude_session_id: 'claude-456',
      working_dir: '/path/to/dir',
      name: 'my-session'
    }

    const mockImportService = {
      import: vi.fn().mockResolvedValue(mockSession),
      findByName: vi.fn().mockResolvedValue(null)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-456',
      name: 'my-session',
      cwd: '/path/to/dir',
      labels: []
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act
    await importCommand('claude-456', { name: 'my-session' })

    // Assert — verify stdout.print was called for each line
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(1, 'Imported: session-123')
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(2, '  Claude session: claude-456')
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(3, '  Working dir:    /path/to/dir')
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(4, '  Name:           my-session')
  })

  it('should not print name line when session does not have name property', async () => {
    // Setup
    const mockSession = {
      id: 'session-123',
      claude_session_id: 'claude-456',
      working_dir: '/path/to/dir'
      // intentionally omit name property
    }

    const mockImportService = {
      import: vi.fn().mockResolvedValue(mockSession)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-456',
      cwd: '/path/to/dir',
      labels: []
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act
    await importCommand('claude-456', { cwd: '/path/to/dir' })

    // Assert — exactly 3 prints, no name
    expect(vi.mocked(stdout).print).toHaveBeenCalledTimes(3)
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(1, 'Imported: session-123')
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(2, '  Claude session: claude-456')
    expect(vi.mocked(stdout).print).toHaveBeenNthCalledWith(3, '  Working dir:    /path/to/dir')
  })

  it('should print error to stderr and exit when parseImportSession throws', async () => {
    // Setup
    const error = new Error('Invalid session ID format')
    vi.mocked(parseImportSession).mockImplementation(() => {
      throw error
    })

    // Act & Assert
    try {
      await importCommand('invalid-id', {})
    } catch {
      // process.exit throws due to mock
    }

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to import session', error)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should print error to stderr and exit when importService.import rejects', async () => {
    // Setup
    const error = new Error('Session not found')
    const mockImportService = {
      import: vi.fn().mockRejectedValue(error)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-456',
      cwd: '/path/to/dir',
      labels: []
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act & Assert
    try {
      await importCommand('claude-456', { cwd: '/path/to/dir' })
    } catch {
      // process.exit throws due to mock
    }

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to import session', error)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should resolve ImportService from DI container using TOKENS.ImportService', async () => {
    // Setup
    const mockSession = {
      id: 'session-789',
      claude_session_id: 'claude-999',
      working_dir: '/tmp'
    }

    const mockImportService = {
      import: vi.fn().mockResolvedValue(mockSession)
    }

    vi.mocked(parseImportSession).mockReturnValue({
      claudeSessionId: 'claude-999',
      cwd: '/tmp',
      labels: []
    })

    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockImportService)

    // Act
    await importCommand('claude-999', { cwd: '/tmp' })

    // Assert — verify container was resolved with correct token
    expect(vi.mocked(container).resolve).toHaveBeenCalledWith(TOKENS.ImportService)
  })
})

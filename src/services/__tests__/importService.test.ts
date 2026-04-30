import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { ISessionImportDomain } from '@src/domains/ports/import'
import { ImportService } from '../importService'

vi.mock('@src/utils/output', () => ({
  debug: { print: vi.fn() },
  stdout: { print: vi.fn() },
  stderr: { print: vi.fn() }
}))

import { debug } from '@src/utils/output'

const stubSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id-123',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  claude_session_id: 'claude-session-abc',
  working_dir: '/default/working/dir',
  metadata: { labels: [], status: 'completed' },
  ...overrides
})

describe('ImportService', () => {
  let importService: ImportService
  let mockSessionDomain: ISessionDomain
  let mockImportDomain: ISessionImportDomain
  let mockBuiltSession: Session

  beforeEach(() => {
    vi.clearAllMocks()

    mockBuiltSession = stubSession()

    mockSessionDomain = {
      save: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn()
    } as unknown as ISessionDomain

    mockImportDomain = {
      resolveWorkingDir: vi.fn().mockReturnValue('/default/working/dir'),
      validateSession: vi.fn(),
      buildSession: vi.fn().mockReturnValue(mockBuiltSession)
    } as unknown as ISessionImportDomain

    importService = new ImportService(mockSessionDomain, mockImportDomain)
  })

  describe('import', () => {
    it('should resolve working dir from domain when cwd is not provided', async () => {
      await importService.import('claude-session-abc')

      expect(mockImportDomain.resolveWorkingDir).toHaveBeenCalledWith('claude-session-abc')
      expect(mockImportDomain.validateSession).not.toHaveBeenCalled()
    })

    it('should use provided cwd and validate session when cwd is given', async () => {
      await importService.import('claude-session-abc', { cwd: '/custom/path' })

      expect(mockImportDomain.resolveWorkingDir).not.toHaveBeenCalled()
      expect(mockImportDomain.validateSession).toHaveBeenCalledWith(
        'claude-session-abc',
        '/custom/path'
      )
    })

    it('should delegate entity construction to importDomain.buildSession', async () => {
      await importService.import('claude-session-abc')

      expect(mockImportDomain.buildSession).toHaveBeenCalledWith(
        'claude-session-abc',
        '/default/working/dir',
        { name: undefined, labels: undefined }
      )
    })

    it('should pass name and labels options to buildSession', async () => {
      await importService.import('claude-session-abc', {
        name: 'My Session',
        labels: ['tag-a', 'tag-b']
      })

      expect(mockImportDomain.buildSession).toHaveBeenCalledWith(
        'claude-session-abc',
        '/default/working/dir',
        { name: 'My Session', labels: ['tag-a', 'tag-b'] }
      )
    })

    it('should save the session returned by buildSession', async () => {
      await importService.import('claude-session-abc')

      expect(mockSessionDomain.save).toHaveBeenCalledWith(mockBuiltSession)
    })

    it('should return the session returned by buildSession', async () => {
      const result = await importService.import('claude-session-abc')

      expect(result).toBe(mockBuiltSession)
    })

    it('should log session import with session ids', async () => {
      mockBuiltSession = stubSession({ id: 'built-id', claude_session_id: 'claude-session-abc' })
      vi.mocked(mockImportDomain.buildSession).mockReturnValue(mockBuiltSession)

      await importService.import('claude-session-abc')

      expect(debug.print).toHaveBeenCalledWith(
        'Session imported',
        expect.objectContaining({
          session_id: 'built-id',
          claude_session_id: 'claude-session-abc'
        })
      )
    })

    it('should validate before building session when cwd is provided', async () => {
      const callOrder: string[] = []
      vi.mocked(mockImportDomain.validateSession).mockImplementationOnce(() => {
        callOrder.push('validate')
      })
      vi.mocked(mockImportDomain.buildSession).mockImplementationOnce(() => {
        callOrder.push('build')
        return mockBuiltSession
      })

      await importService.import('claude-session-abc', { cwd: '/custom/path' })

      expect(callOrder).toEqual(['validate', 'build'])
    })

    it('should propagate error when validateSession throws', async () => {
      vi.mocked(mockImportDomain.validateSession).mockImplementationOnce(() => {
        throw new Error('Validation failed')
      })

      await expect(
        importService.import('claude-session-abc', { cwd: '/custom/path' })
      ).rejects.toThrow('Validation failed')
    })

    it('should propagate error when save throws', async () => {
      vi.mocked(mockSessionDomain.save).mockRejectedValueOnce(new Error('Save failed'))

      await expect(importService.import('claude-session-abc')).rejects.toThrow('Save failed')
    })
  })
})

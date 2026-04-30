import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { SessionImportDomain } from '../sessionImport'

vi.mock('@src/utils/uuid', () => ({ generateId: vi.fn() }))
vi.mock('@src/utils/date', () => ({ toISO: vi.fn() }))

import { generateId } from '@src/utils/uuid'
import { toISO } from '@src/utils/date'

const mockClaudeSessionRepo: IClaudeSessionRepository = {
  findEncodedDirBySessionId: vi.fn(),
  decodeWorkingDir: vi.fn(),
  validateSessionAtDir: vi.fn(),
  readSession: vi.fn(),
  scanSessionStats: vi.fn(),
  getAssistantTurns: vi.fn()
}

describe('SessionImportDomain', () => {
  let domain: SessionImportDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionImportDomain(mockClaudeSessionRepo)
  })

  describe('resolveWorkingDir', () => {
    it('should return the decoded path when unambiguous and non-null', () => {
      vi.mocked(mockClaudeSessionRepo.findEncodedDirBySessionId).mockReturnValue(
        '-Users-alice-projects-foo'
      )
      vi.mocked(mockClaudeSessionRepo.decodeWorkingDir).mockReturnValue({
        path: '/Users/alice/projects/foo',
        ambiguous: false
      })

      const result = domain.resolveWorkingDir('session-abc')

      expect(mockClaudeSessionRepo.findEncodedDirBySessionId).toHaveBeenCalledWith('session-abc')
      expect(mockClaudeSessionRepo.decodeWorkingDir).toHaveBeenCalledWith(
        '-Users-alice-projects-foo'
      )
      expect(result).toBe('/Users/alice/projects/foo')
    })

    it('should throw when the decoded working directory is ambiguous', () => {
      vi.mocked(mockClaudeSessionRepo.findEncodedDirBySessionId).mockReturnValue('-Users-alice-foo')
      vi.mocked(mockClaudeSessionRepo.decodeWorkingDir).mockReturnValue({
        path: '/Users/alice/foo',
        ambiguous: true
      })

      expect(() => domain.resolveWorkingDir('session-abc')).toThrow(
        'Working directory is ambiguous for session session-abc'
      )
      expect(() => domain.resolveWorkingDir('session-abc')).toThrow(
        '--cwd to specify the working directory explicitly'
      )
    })

    it('should throw when the decoded path is null', () => {
      vi.mocked(mockClaudeSessionRepo.findEncodedDirBySessionId).mockReturnValue(
        'invalid-encoded-path'
      )
      vi.mocked(mockClaudeSessionRepo.decodeWorkingDir).mockReturnValue({
        path: null,
        ambiguous: false
      })

      expect(() => domain.resolveWorkingDir('session-xyz')).toThrow(
        'Could not decode working directory from project path "invalid-encoded-path"'
      )
      expect(() => domain.resolveWorkingDir('session-xyz')).toThrow(
        '--cwd to specify the working directory explicitly'
      )
    })
  })

  describe('validateSession', () => {
    it('should delegate to claudeSessionRepo.validateSessionAtDir', () => {
      domain.validateSession('session-abc', '/Users/alice/projects/foo')

      expect(mockClaudeSessionRepo.validateSessionAtDir).toHaveBeenCalledWith(
        'session-abc',
        '/Users/alice/projects/foo'
      )
    })
  })

  describe('buildSession', () => {
    beforeEach(() => {
      vi.mocked(generateId).mockReturnValue('generated-id-xyz')
      vi.mocked(toISO).mockReturnValue('2024-06-01T12:00:00Z')
    })

    it('should assign id from generateId', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', {})

      expect(session.id).toBe('generated-id-xyz')
    })

    it('should assign created_at and updated_at from toISO', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', {})

      expect(session.created_at).toBe('2024-06-01T12:00:00Z')
      expect(session.updated_at).toBe('2024-06-01T12:00:00Z')
    })

    it('should use the same timestamp for created_at and updated_at', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', {})

      expect(session.created_at).toBe(session.updated_at)
    })

    it('should assign claude_session_id from argument', () => {
      const session = domain.buildSession('claude-session-42', '/work/dir', {})

      expect(session.claude_session_id).toBe('claude-session-42')
    })

    it('should assign working_dir from argument', () => {
      const session = domain.buildSession('claude-abc', '/my/project', {})

      expect(session.working_dir).toBe('/my/project')
    })

    it('should set metadata.status to completed', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', {})

      expect(session.metadata.status).toBe('completed')
    })

    it('should default metadata.labels to empty array when not provided', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', {})

      expect(session.metadata.labels).toEqual([])
    })

    it('should assign metadata.labels from options', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', { labels: ['alpha', 'beta'] })

      expect(session.metadata.labels).toEqual(['alpha', 'beta'])
    })

    it('should include name when provided', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', { name: 'My Session' })

      expect(session.name).toBe('My Session')
    })

    it('should omit name property when name is undefined', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', { name: undefined })

      expect(session).not.toHaveProperty('name')
    })

    it('should include empty-string name when explicitly set to empty string', () => {
      const session = domain.buildSession('claude-abc', '/work/dir', { name: '' })

      expect(session.name).toBe('')
    })

    it('should call toISO exactly once per build', () => {
      domain.buildSession('claude-abc', '/work/dir', {})

      expect(toISO).toHaveBeenCalledTimes(1)
    })
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { ImportDomain } from '../import'

const mockClaudeSessionRepo: IClaudeSessionRepository = {
  findEncodedDirBySessionId: vi.fn(),
  decodeWorkingDir: vi.fn(),
  validateSessionAtDir: vi.fn(),
  readSession: vi.fn(),
  getAssistantTurns: vi.fn()
}

describe('ImportDomain', () => {
  let domain: ImportDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new ImportDomain(mockClaudeSessionRepo)
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
})

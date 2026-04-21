import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GitRepository } from '@src/repositories/gitRepository'
import { execGitSync } from '@src/infrastructures/git'

vi.mock('@src/infrastructures/git', () => ({
  execGitSync: vi.fn()
}))

const mockExecGitSync = vi.mocked(execGitSync)

describe('GitRepository', () => {
  let repo: GitRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new GitRepository()
  })

  // ─── getDiffStat ───────────────────────────────────────────────────────────

  describe('getDiffStat', () => {
    it('returns combined staged and unstaged stat when both are non-empty', () => {
      mockExecGitSync.mockReturnValueOnce('staged stat').mockReturnValueOnce('unstaged stat')
      expect(repo.getDiffStat()).toBe('staged stat\nunstaged stat')
    })

    it('returns only the non-empty part when unstaged stat is empty', () => {
      mockExecGitSync.mockReturnValueOnce('staged stat').mockReturnValueOnce('')
      expect(repo.getDiffStat()).toBe('staged stat')
    })

    it('returns only the non-empty part when staged stat is empty', () => {
      mockExecGitSync.mockReturnValueOnce('').mockReturnValueOnce('unstaged stat')
      expect(repo.getDiffStat()).toBe('unstaged stat')
    })

    it('returns null when both staged and unstaged stats are empty strings', () => {
      mockExecGitSync.mockReturnValueOnce('').mockReturnValueOnce('')
      expect(repo.getDiffStat()).toBeNull()
    })

    it('returns null when execGitSync throws', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('git error')
      })
      expect(repo.getDiffStat()).toBeNull()
    })
  })

  // ─── getHead ──────────────────────────────────────────────────────────────

  describe('getHead', () => {
    it('returns the HEAD commit sha', () => {
      mockExecGitSync.mockReturnValueOnce('abc123def456')
      expect(repo.getHead()).toBe('abc123def456')
    })

    it('passes the correct git command', () => {
      mockExecGitSync.mockReturnValueOnce('abc123')
      repo.getHead()
      expect(mockExecGitSync).toHaveBeenCalledWith('rev-parse HEAD')
    })

    it('returns null when execGitSync throws', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('not a git repo')
      })
      expect(repo.getHead()).toBeNull()
    })
  })

  // ─── getDiffSummary ───────────────────────────────────────────────────────

  describe('getDiffSummary', () => {
    it('returns the diff stat between two refs', () => {
      mockExecGitSync.mockReturnValueOnce('1 file changed, 3 insertions(+)')
      expect(repo.getDiffSummary('HEAD~1', 'HEAD')).toBe('1 file changed, 3 insertions(+)')
    })

    it('uses three-dot diff syntax in the git command', () => {
      mockExecGitSync.mockReturnValueOnce('stat output')
      repo.getDiffSummary('main', 'feature')
      expect(mockExecGitSync).toHaveBeenCalledWith('diff main...feature --stat')
    })

    it('returns null when the stat output is an empty string', () => {
      mockExecGitSync.mockReturnValueOnce('')
      expect(repo.getDiffSummary('HEAD~1', 'HEAD')).toBeNull()
    })

    it('returns null when execGitSync throws', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('unknown ref')
      })
      expect(repo.getDiffSummary('bad-ref', 'HEAD')).toBeNull()
    })
  })

  // ─── getDiff ──────────────────────────────────────────────────────────────

  describe('getDiff', () => {
    it('returns the diff output between two refs', () => {
      mockExecGitSync.mockReturnValueOnce('diff --git a/foo.ts b/foo.ts\n...')
      expect(repo.getDiff('HEAD~1', 'HEAD')).toBe('diff --git a/foo.ts b/foo.ts\n...')
    })

    it('uses two-dot diff syntax in the git command', () => {
      mockExecGitSync.mockReturnValueOnce('diff output')
      repo.getDiff('main', 'feature')
      expect(mockExecGitSync).toHaveBeenCalledWith('diff main feature')
    })

    it('returns null when the diff output is an empty string', () => {
      mockExecGitSync.mockReturnValueOnce('')
      expect(repo.getDiff('HEAD~1', 'HEAD')).toBeNull()
    })

    it('returns null when execGitSync throws', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('bad revision')
      })
      expect(repo.getDiff('bad-ref', 'HEAD')).toBeNull()
    })
  })

  // ─── stageUpdated ─────────────────────────────────────────────────────────

  describe('stageUpdated', () => {
    it('calls execGitSync with the correct add -u command', () => {
      mockExecGitSync.mockReturnValueOnce('')
      repo.stageUpdated('src/foo.ts')
      expect(mockExecGitSync).toHaveBeenCalledWith('add -u "src/foo.ts"')
    })

    it('propagates an error thrown by execGitSync', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('nothing to stage')
      })
      expect(() => repo.stageUpdated('src/foo.ts')).toThrow('nothing to stage')
    })
  })

  // ─── stageNew ─────────────────────────────────────────────────────────────

  describe('stageNew', () => {
    it('calls execGitSync with the correct add command', () => {
      mockExecGitSync.mockReturnValueOnce('')
      repo.stageNew('src/bar.ts')
      expect(mockExecGitSync).toHaveBeenCalledWith('add "src/bar.ts"')
    })

    it('propagates an error thrown by execGitSync', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('pathspec did not match')
      })
      expect(() => repo.stageNew('nonexistent.ts')).toThrow('pathspec did not match')
    })
  })

  // ─── commit ───────────────────────────────────────────────────────────────

  describe('commit', () => {
    it('calls execGitSync with the correct commit -m command', () => {
      mockExecGitSync.mockReturnValueOnce('')
      repo.commit('feat: add new feature')
      expect(mockExecGitSync).toHaveBeenCalledWith('commit -m "feat: add new feature"')
    })

    it('propagates an error thrown by execGitSync', () => {
      mockExecGitSync.mockImplementation(() => {
        throw new Error('nothing to commit')
      })
      expect(() => repo.commit('empty commit')).toThrow('nothing to commit')
    })
  })
})

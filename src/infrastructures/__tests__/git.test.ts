import { vi, describe, it, expect, beforeEach } from 'vitest'
import { spawnSync } from 'child_process'
import { GitInfra } from '../git'

vi.mock('child_process', () => ({
  spawnSync: vi.fn()
}))

const mockSpawnSync = vi.mocked(spawnSync)

describe('GitInfra', () => {
  let infra: GitInfra

  beforeEach(() => {
    vi.clearAllMocks()
    infra = new GitInfra()
  })

  describe('spawnGitSync', () => {
    it('returns trimmed stdout', () => {
      mockSpawnSync.mockReturnValue({ stdout: '  abc123  \n', stderr: '', status: 0 } as never)

      expect(infra.spawnGitSync(['rev-parse', 'HEAD'])).toBe('abc123')
    })

    it('passes args array to spawnSync', () => {
      mockSpawnSync.mockReturnValue({ stdout: '', stderr: '', status: 0 } as never)

      infra.spawnGitSync(['diff', '--cached'], '/repo')

      expect(mockSpawnSync).toHaveBeenCalledWith('git', ['diff', '--cached'], {
        encoding: 'utf-8',
        cwd: '/repo'
      })
    })

    it('returns empty string when stdout is null', () => {
      mockSpawnSync.mockReturnValue({ stdout: null, stderr: '', status: 1 } as never)

      expect(infra.spawnGitSync(['diff', '--no-index', '/dev/null', 'f.ts'])).toBe('')
    })
  })

  describe('execGitSync', () => {
    it('returns trimmed stdout on success', () => {
      mockSpawnSync.mockReturnValue({ stdout: 'abc123\n', stderr: '', status: 0 } as never)

      expect(infra.execGitSync(['rev-parse', 'HEAD'])).toBe('abc123')
    })

    it('throws on non-zero exit with stderr message', () => {
      mockSpawnSync.mockReturnValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        status: 128
      } as never)

      expect(() => infra.execGitSync(['status'])).toThrow('fatal: not a git repository')
    })

    it('throws with fallback message when stderr is empty', () => {
      mockSpawnSync.mockReturnValue({ stdout: '', stderr: '', status: 1 } as never)

      expect(() => infra.execGitSync(['commit', '-m', 'msg'])).toThrow('git commit exited with 1')
    })

    it('passes cwd option', () => {
      mockSpawnSync.mockReturnValue({ stdout: '', stderr: '', status: 0 } as never)

      infra.execGitSync(['log'], '/some/dir')

      expect(mockSpawnSync).toHaveBeenCalledWith('git', ['log'], {
        encoding: 'utf-8',
        cwd: '/some/dir'
      })
    })
  })
})

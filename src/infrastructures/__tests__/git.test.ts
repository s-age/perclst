import { vi, describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { execGitSync } from '../git'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

describe('execGitSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the output of the git command', () => {
    vi.mocked(execSync).mockReturnValue('abc123')

    const result = execGitSync('rev-parse HEAD')

    expect(result).toBe('abc123')
  })

  it('should trim trailing whitespace from execSync output', () => {
    vi.mocked(execSync).mockReturnValue('abc123\n')

    const result = execGitSync('rev-parse HEAD')

    expect(result).toBe('abc123')
  })

  it('should trim leading whitespace from execSync output', () => {
    vi.mocked(execSync).mockReturnValue('  abc123')

    const result = execGitSync('rev-parse HEAD')

    expect(result).toBe('abc123')
  })

  it('should call execSync with git prepended to the args', () => {
    vi.mocked(execSync).mockReturnValue('')

    execGitSync('status --short')

    expect(execSync).toHaveBeenCalledWith('git status --short', expect.anything())
  })

  it('should call execSync with utf-8 encoding option', () => {
    vi.mocked(execSync).mockReturnValue('')

    execGitSync('log --oneline')

    expect(execSync).toHaveBeenCalledWith(expect.anything(), { encoding: 'utf-8' })
  })

  it('should propagate errors thrown by execSync', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: not a git repository')
    })

    expect(() => execGitSync('status')).toThrow('fatal: not a git repository')
  })
})

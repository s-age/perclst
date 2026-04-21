import { vi, describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    homedir: vi.fn(),
    tmpdir: vi.fn()
  }
}))

vi.mock('fs', () => ({
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync
}))

vi.mock('os', () => ({
  homedir: mocks.homedir,
  tmpdir: mocks.tmpdir
}))

import { ClaudeCodeInfra } from '../../claudeCode.js'

describe('ClaudeCodeInfra', () => {
  let infra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tmpdir.mockReturnValue('/tmp')
    infra = new ClaudeCodeInfra()
  })

  describe('resolveJsonlPath', () => {
    it('should build the correct JSONL path by encoding forward-slashes in workingDir', () => {
      mocks.homedir.mockReturnValue('/home/testuser')

      const result = infra.resolveJsonlPath('abc123', '/work/my-project')

      const expected = join(
        '/home/testuser',
        '.claude',
        'projects',
        '-work-my-project',
        'abc123.jsonl'
      )
      expect(result).toBe(expected)
    })
  })

  describe('countJsonlLines', () => {
    it('should return 0 when the file does not exist', () => {
      mocks.existsSync.mockReturnValue(false)

      expect(infra.countJsonlLines('/sessions/missing.jsonl')).toBe(0)
    })

    it('should return the count of non-empty lines when the file exists', () => {
      mocks.existsSync.mockReturnValue(true)
      mocks.readFileSync.mockReturnValue('line1\nline2\n\nline3\n')

      expect(infra.countJsonlLines('/sessions/sess.jsonl')).toBe(3)
    })
  })

  describe('writeStderr', () => {
    it('should write the data string to process.stderr', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

      infra.writeStderr('error output')

      expect(writeSpy).toHaveBeenCalledWith('error output')
      writeSpy.mockRestore()
    })
  })
})

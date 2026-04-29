import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    tmpdir: vi.fn()
  }
}))

vi.mock('fs', () => ({
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync
}))

vi.mock('os', () => ({
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

  describe('writeStderr', () => {
    it('should write the data string to process.stderr', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

      infra.writeStderr('error output')

      expect(writeSpy).toHaveBeenCalledWith('error output')
      writeSpy.mockRestore()
    })
  })
})

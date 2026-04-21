import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ShellRepository } from '@src/repositories/shell'
import type { ShellResult } from '@src/types/shell'

vi.mock('@src/infrastructures/shell')

import { execShell } from '@src/infrastructures/shell'

const mockExecShell = vi.mocked(execShell)

describe('ShellRepository', () => {
  let repo: ShellRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ShellRepository()
  })

  describe('exec', () => {
    it('calls execShell with the given command', async () => {
      const result: ShellResult = { exitCode: 0, stdout: '', stderr: '' }
      mockExecShell.mockResolvedValue(result)

      await repo.exec('echo hello', '/tmp')

      expect(mockExecShell).toHaveBeenCalledWith('echo hello', '/tmp')
    })

    it('calls execShell with the given cwd', async () => {
      const result: ShellResult = { exitCode: 0, stdout: '', stderr: '' }
      mockExecShell.mockResolvedValue(result)

      await repo.exec('ls', '/home/user')

      expect(mockExecShell).toHaveBeenCalledWith('ls', '/home/user')
    })

    it('returns the ShellResult resolved by execShell', async () => {
      const result: ShellResult = { exitCode: 0, stdout: 'hello\n', stderr: '' }
      mockExecShell.mockResolvedValue(result)

      const actual = await repo.exec('echo hello', '/tmp')

      expect(actual).toEqual(result)
    })

    it('returns a non-zero exit code when execShell resolves with one', async () => {
      const result: ShellResult = { exitCode: 1, stdout: '', stderr: 'error output' }
      mockExecShell.mockResolvedValue(result)

      const actual = await repo.exec('false', '/tmp')

      expect(actual.exitCode).toBe(1)
    })

    it('propagates rejection when execShell rejects', async () => {
      mockExecShell.mockRejectedValue(new Error('spawn failed'))

      await expect(repo.exec('bad-command', '/tmp')).rejects.toThrow('spawn failed')
    })
  })
})

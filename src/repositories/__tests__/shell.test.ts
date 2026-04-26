import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ShellRepository } from '@src/repositories/shell'
import type { ShellInfra } from '@src/infrastructures/shell'
import type { ShellResult } from '@src/types/shell'

describe('ShellRepository', () => {
  let repo: ShellRepository
  let mockShellInfra: ShellInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockShellInfra = { execShell: vi.fn() } as unknown as ShellInfra
    repo = new ShellRepository(mockShellInfra)
  })

  describe('exec', () => {
    it('calls execShell with the given command', async () => {
      const result: ShellResult = { exitCode: 0, stdout: '', stderr: '' }
      vi.mocked(mockShellInfra.execShell).mockResolvedValue(result)

      await repo.exec('echo hello', '/tmp')

      expect(mockShellInfra.execShell).toHaveBeenCalledWith('echo hello', '/tmp')
    })

    it('calls execShell with the given cwd', async () => {
      const result: ShellResult = { exitCode: 0, stdout: '', stderr: '' }
      vi.mocked(mockShellInfra.execShell).mockResolvedValue(result)

      await repo.exec('ls', '/home/user')

      expect(mockShellInfra.execShell).toHaveBeenCalledWith('ls', '/home/user')
    })

    it('returns the ShellResult resolved by execShell', async () => {
      const result: ShellResult = { exitCode: 0, stdout: 'hello\n', stderr: '' }
      vi.mocked(mockShellInfra.execShell).mockResolvedValue(result)

      const actual = await repo.exec('echo hello', '/tmp')

      expect(actual).toEqual(result)
    })

    it('returns a non-zero exit code when execShell resolves with one', async () => {
      const result: ShellResult = { exitCode: 1, stdout: '', stderr: 'error output' }
      vi.mocked(mockShellInfra.execShell).mockResolvedValue(result)

      const actual = await repo.exec('false', '/tmp')

      expect(actual.exitCode).toBe(1)
    })

    it('propagates rejection when execShell rejects', async () => {
      vi.mocked(mockShellInfra.execShell).mockRejectedValue(new Error('spawn failed'))

      await expect(repo.exec('bad-command', '/tmp')).rejects.toThrow('spawn failed')
    })
  })
})

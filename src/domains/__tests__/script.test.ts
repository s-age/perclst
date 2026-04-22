import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IShellRepository } from '@src/repositories/ports/shell'
import type { ScriptResult } from '@src/domains/ports/script'
import { ScriptDomain } from '../script'

describe('ScriptDomain', () => {
  let mockShellRepo: { exec: ReturnType<typeof vi.fn> }
  let scriptDomain: ScriptDomain

  beforeEach(() => {
    mockShellRepo = {
      exec: vi.fn()
    }
    scriptDomain = new ScriptDomain(mockShellRepo as IShellRepository)
  })

  describe('run', () => {
    it('calls shellRepo.exec with the provided command and cwd', async () => {
      const command = 'ls -la'
      const cwd = '/home/user'

      await scriptDomain.run(command, cwd)

      expect(mockShellRepo.exec).toHaveBeenCalledWith(command, cwd)
    })

    it('returns the ScriptResult from shellRepo.exec', async () => {
      const mockResult: ScriptResult = {
        exitCode: 0,
        stdout: 'file1.txt\nfile2.txt',
        stderr: ''
      }
      mockShellRepo.exec.mockResolvedValueOnce(mockResult)

      const result = await scriptDomain.run('ls', '/tmp')

      expect(result).toEqual(mockResult)
    })

    it('handles different command strings', async () => {
      const mockResult: ScriptResult = { exitCode: 0, stdout: '', stderr: '' }
      mockShellRepo.exec.mockResolvedValueOnce(mockResult)

      await scriptDomain.run('npm install', '/project')

      expect(mockShellRepo.exec).toHaveBeenCalledWith('npm install', '/project')
    })

    it('handles ScriptResult with non-zero exit code', async () => {
      const mockResult: ScriptResult = {
        exitCode: 1,
        stdout: '',
        stderr: 'error occurred'
      }
      mockShellRepo.exec.mockResolvedValueOnce(mockResult)

      const result = await scriptDomain.run('false', '/home')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('error occurred')
    })

    it('propagates errors thrown by shellRepo.exec', async () => {
      const error = new Error('shell execution failed')
      mockShellRepo.exec.mockRejectedValueOnce(error)

      await expect(scriptDomain.run('bad command', '/tmp')).rejects.toThrow(
        'shell execution failed'
      )
    })

    it('passes through stdout and stderr from exec result', async () => {
      const mockResult: ScriptResult = {
        exitCode: 0,
        stdout: 'success output',
        stderr: 'warning message'
      }
      mockShellRepo.exec.mockResolvedValueOnce(mockResult)

      const result = await scriptDomain.run('command', '/path')

      expect(result.stdout).toBe('success output')
      expect(result.stderr).toBe('warning message')
    })

    it('clears mocks between calls', async () => {
      const mockResult: ScriptResult = { exitCode: 0, stdout: '', stderr: '' }
      mockShellRepo.exec.mockResolvedValueOnce(mockResult)

      await scriptDomain.run('cmd1', '/path1')
      expect(mockShellRepo.exec).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()

      mockShellRepo.exec.mockResolvedValueOnce(mockResult)
      await scriptDomain.run('cmd2', '/path2')

      expect(mockShellRepo.exec).toHaveBeenCalledTimes(1)
      expect(mockShellRepo.exec).toHaveBeenCalledWith('cmd2', '/path2')
    })
  })
})

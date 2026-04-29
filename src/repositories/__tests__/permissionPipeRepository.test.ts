import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PermissionPipeRepository } from '../permissionPipeRepository.js'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TtyInfra } from '@src/infrastructures/ttyInfrastructure'
import { formatInputSummary } from '@src/utils/formatInputSummary'

vi.mock('@src/utils/formatInputSummary.js', () => ({
  formatInputSummary: vi.fn()
}))

type PermissionPipeFs = Pick<FsInfra, 'fileExists' | 'readText' | 'removeFileSync' | 'writeText'>

describe('PermissionPipeRepository', () => {
  let repo: PermissionPipeRepository
  let mockFs: PermissionPipeFs
  let mockTty: TtyInfra

  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.PERCLST_PERMISSION_PIPE
    delete process.env.PERCLST_PERMISSION_AUTO_YES
    mockFs = {
      fileExists: vi.fn(),
      readText: vi.fn(),
      removeFileSync: vi.fn(),
      writeText: vi.fn()
    } as unknown as PermissionPipeFs
    mockTty = {
      openTty: vi.fn(),
      writeTty: vi.fn(),
      readTty: vi.fn(),
      closeTty: vi.fn()
    } as unknown as TtyInfra
    repo = new PermissionPipeRepository(mockFs, mockTty)
  })

  // ---------------------------------------------------------------------------
  // pollRequest
  // ---------------------------------------------------------------------------

  describe('pollRequest', () => {
    it('returns null when PERCLST_PERMISSION_PIPE is not set', () => {
      const result = repo.pollRequest()
      expect(result).toBeNull()
    })

    it('returns null when the req file does not exist', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(false)
      const result = repo.pollRequest()
      expect(result).toBeNull()
    })

    it('checks fileExists on the .req path derived from the pipe path', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(false)
      repo.pollRequest()
      expect(mockFs.fileExists).toHaveBeenCalledWith('/tmp/pipe.req')
    })

    it('returns the parsed request when the req file exists and contains valid JSON', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"tool_name":"Bash","input":{"cmd":"ls"}}')
      const result = repo.pollRequest()
      expect(result).toEqual({ tool_name: 'Bash', input: { cmd: 'ls' } })
    })

    it('removes the req file after successfully reading it', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"tool_name":"Bash","input":{}}')
      repo.pollRequest()
      expect(mockFs.removeFileSync).toHaveBeenCalledWith('/tmp/pipe.req')
    })

    it('returns null when the req file contains invalid JSON', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('not-valid-json{{{')
      const result = repo.pollRequest()
      expect(result).toBeNull()
    })

    it('still returns the parsed request when removeFileSync throws', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"tool_name":"Bash","input":{}}')
      vi.mocked(mockFs.removeFileSync).mockImplementation(() => {
        throw new Error('permission denied')
      })
      const result = repo.pollRequest()
      expect(result).toEqual({ tool_name: 'Bash', input: {} })
    })
  })

  // ---------------------------------------------------------------------------
  // respond
  // ---------------------------------------------------------------------------

  describe('respond', () => {
    it('writes the serialized result to the .res path', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      repo.respond({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
      expect(mockFs.writeText).toHaveBeenCalledWith(
        '/tmp/pipe.res',
        JSON.stringify({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
      )
    })

    it('does nothing when PERCLST_PERMISSION_PIPE is not set', () => {
      repo.respond({ behavior: 'allow', updatedInput: {} })
      expect(mockFs.writeText).not.toHaveBeenCalled()
    })

    it('does not throw when writeText throws', () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.writeText).mockImplementation(() => {
        throw new Error('disk full')
      })
      expect(() => repo.respond({ behavior: 'deny', message: 'denied' })).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // askPermission — routing
  // ---------------------------------------------------------------------------

  describe('askPermission', () => {
    it('returns allow immediately when PERCLST_PERMISSION_AUTO_YES is "1"', async () => {
      process.env.PERCLST_PERMISSION_AUTO_YES = '1'
      const result = await repo.askPermission({ tool_name: 'Bash', input: { cmd: 'ls' } })
      expect(result).toEqual({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
    })

    it('does not write any files when auto-yes is enabled', async () => {
      process.env.PERCLST_PERMISSION_AUTO_YES = '1'
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockFs.writeText).not.toHaveBeenCalled()
    })

    it('routes to IPC when PERCLST_PERMISSION_PIPE is set (writeText is called for .req)', async () => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"allow","updatedInput":{}}')
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockFs.writeText).toHaveBeenCalledWith('/tmp/pipe.req', expect.any(String))
    })

    it('routes to TTY when neither pipe nor auto-yes env vars are set', async () => {
      vi.mocked(formatInputSummary).mockReturnValue('summary')
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('y')
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockTty.openTty).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // askViaIPC (exercised via askPermission with PERCLST_PERMISSION_PIPE)
  // ---------------------------------------------------------------------------

  describe('askViaIPC', () => {
    beforeEach(() => {
      process.env.PERCLST_PERMISSION_PIPE = '/tmp/pipe'
    })

    it('writes the request JSON including tool_use_id to the .req path', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"allow","updatedInput":{}}')
      await repo.askPermission({ tool_name: 'Bash', input: { cmd: 'ls' }, tool_use_id: 'abc' })
      expect(mockFs.writeText).toHaveBeenCalledWith(
        '/tmp/pipe.req',
        JSON.stringify({ tool_name: 'Bash', input: { cmd: 'ls' }, tool_use_id: 'abc' })
      )
    })

    it('does not include tool_use_id in the req JSON when it is absent', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"allow","updatedInput":{}}')
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      const written = vi.mocked(mockFs.writeText).mock.calls[0][1] as string
      expect(JSON.parse(written)).not.toHaveProperty('tool_use_id')
    })

    it('returns the parsed PermissionResult when the response file appears', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"deny","message":"not allowed"}')
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({ behavior: 'deny', message: 'not allowed' })
    })

    it('removes the response file after reading it', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"allow","updatedInput":{}}')
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockFs.removeFileSync).toHaveBeenCalledWith('/tmp/pipe.res')
    })

    it('returns deny with parse-error message when response JSON is invalid', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{{bad json}}')
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({ behavior: 'deny', message: 'Failed to parse permission response' })
    })

    it('still returns the result when removeFileSync on the res file throws', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('{"behavior":"allow","updatedInput":{}}')
      vi.mocked(mockFs.removeFileSync).mockImplementation(() => {
        throw new Error('perm')
      })
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({ behavior: 'allow', updatedInput: {} })
    })

    describe('timeout', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('returns deny with timeout message when the response never arrives within 60 s', async () => {
        vi.mocked(mockFs.fileExists).mockReturnValue(false)
        const resultPromise = repo.askPermission({ tool_name: 'Bash', input: {} })
        await vi.advanceTimersByTimeAsync(61_000)
        const result = await resultPromise
        expect(result).toEqual({ behavior: 'deny', message: 'Permission request timed out' })
      })
    })
  })

  // ---------------------------------------------------------------------------
  // askViaTTY (exercised via askPermission with no env vars)
  // ---------------------------------------------------------------------------

  describe('askViaTTY', () => {
    beforeEach(() => {
      vi.mocked(formatInputSummary).mockReturnValue('input summary')
    })

    it('returns deny with no-terminal message when openTty returns null', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(null)
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({
        behavior: 'deny',
        message: 'No terminal available for interactive prompt'
      })
    })

    it('does not call closeTty when openTty returns null', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(null)
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockTty.closeTty).not.toHaveBeenCalled()
    })

    it('returns allow when the user answers "y"', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('y')
      const result = await repo.askPermission({ tool_name: 'Bash', input: { cmd: 'ls' } })
      expect(result).toEqual({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
    })

    it('returns allow when the user answers "yes"', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('yes')
      const result = await repo.askPermission({ tool_name: 'Bash', input: { cmd: 'ls' } })
      expect(result).toEqual({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
    })

    it('returns allow when the user answers "Y" (case-insensitive)', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('Y')
      const result = await repo.askPermission({ tool_name: 'Bash', input: { cmd: 'ls' } })
      expect(result).toEqual({ behavior: 'allow', updatedInput: { cmd: 'ls' } })
    })

    it('returns deny when the user answers "n"', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('n')
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({ behavior: 'deny', message: 'User denied permission' })
    })

    it('returns deny when the user presses enter without typing anything', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('')
      const result = await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(result).toEqual({ behavior: 'deny', message: 'User denied permission' })
    })

    it('calls closeTty after a successful interaction', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockReturnValue('y')
      await repo.askPermission({ tool_name: 'Bash', input: {} })
      expect(mockTty.closeTty).toHaveBeenCalledWith(3)
    })

    it('calls closeTty in the finally block even when readTty throws', async () => {
      vi.mocked(mockTty.openTty).mockReturnValue(3)
      vi.mocked(mockTty.readTty).mockImplementation(() => {
        throw new Error('tty error')
      })
      await expect(repo.askPermission({ tool_name: 'Bash', input: {} })).rejects.toThrow(
        'tty error'
      )
      expect(mockTty.closeTty).toHaveBeenCalledWith(3)
    })
  })
})

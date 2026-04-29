import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { executeAskPermission } from '../../askPermission'
import { setupContainer } from '@src/core/di/setup'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'
import type { PermissionPipeService } from '@src/services/permissionPipeService'
import type { TtyInfra } from '@src/infrastructures/ttyInfrastructure'

describe('executeAskPermission (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    delete process.env.PERCLST_PERMISSION_AUTO_YES
    delete process.env.PERCLST_PERMISSION_PIPE
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete process.env.PERCLST_PERMISSION_AUTO_YES
    delete process.env.PERCLST_PERMISSION_PIPE
  })

  describe('happy path', () => {
    it('returns approval JSON in content[0].text when service approves', async () => {
      process.env.PERCLST_PERMISSION_AUTO_YES = '1'
      setupContainer({ config: buildTestConfig(dir) })

      const result = await executeAskPermission({
        tool_name: 'Bash',
        input: { command: 'ls' }
      })

      const parsed = JSON.parse(result.content[0].text) as { behavior: string }
      expect(parsed.behavior).toBe('allow')
    })

    it('returns denial JSON in content[0].text when service denies', async () => {
      const ttyStub: TtyInfra = {
        openTty: vi.fn().mockReturnValue(42),
        writeTty: vi.fn(),
        readTty: vi.fn().mockReturnValue('n'),
        closeTty: vi.fn()
      }
      setupContainer({ config: buildTestConfig(dir), infras: { ttyInfra: ttyStub } })

      const result = await executeAskPermission({
        tool_name: 'Write',
        input: { file_path: '/tmp/test.txt' }
      })

      const parsed = JSON.parse(result.content[0].text) as { behavior: string }
      expect(parsed.behavior).toBe('deny')
    })
  })

  describe('null TTY', () => {
    it('returns deny + No terminal message when openTty returns null', async () => {
      const ttyStub: TtyInfra = {
        openTty: vi.fn().mockReturnValue(null),
        writeTty: vi.fn(),
        readTty: vi.fn(),
        closeTty: vi.fn()
      }
      setupContainer({ config: buildTestConfig(dir), infras: { ttyInfra: ttyStub } })

      const result = await executeAskPermission({ tool_name: 'Bash', input: {} })

      const parsed = JSON.parse(result.content[0].text) as { behavior: string; message: string }
      expect(parsed.behavior).toBe('deny')
      expect(parsed.message).toContain('No terminal')
    })
  })

  describe('IPC path', () => {
    let pipePath: string

    beforeEach(() => {
      pipePath = join(dir, 'permission-pipe')
    })

    afterEach(() => {
      rmSync(`${pipePath}.req`, { force: true })
      rmSync(`${pipePath}.res`, { force: true })
    })

    it('receives response via IPC when PERCLST_PERMISSION_PIPE is set', async () => {
      process.env.PERCLST_PERMISSION_PIPE = pipePath
      setupContainer({ config: buildTestConfig(dir) })

      setTimeout(() => {
        writeFileSync(
          `${pipePath}.res`,
          JSON.stringify({ behavior: 'allow', updatedInput: { command: 'ls' } })
        )
      }, 50)

      const result = await executeAskPermission({
        tool_name: 'Bash',
        input: { command: 'ls' }
      })

      const parsed = JSON.parse(result.content[0].text) as { behavior: string }
      expect(parsed.behavior).toBe('allow')
    })

    it('returns deny + parse error message when IPC response is invalid JSON', async () => {
      process.env.PERCLST_PERMISSION_PIPE = pipePath
      setupContainer({ config: buildTestConfig(dir) })

      setTimeout(() => {
        writeFileSync(`${pipePath}.res`, '<<<INVALID JSON>>>')
      }, 50)

      const result = await executeAskPermission({
        tool_name: 'Bash',
        input: { command: 'ls' }
      })

      const parsed = JSON.parse(result.content[0].text) as { behavior: string; message: string }
      expect(parsed.behavior).toBe('deny')
      expect(parsed.message).toContain('parse')
    })
  })

  describe('pollRequest / respond', () => {
    it('pollRequest returns null when PERCLST_PERMISSION_PIPE is not set', () => {
      setupContainer({ config: buildTestConfig(dir) })

      const service = container.resolve<PermissionPipeService>(TOKENS.PermissionPipeService)

      expect(service.pollRequest()).toBeNull()
    })

    it('pollRequest returns the request when req file exists', () => {
      const pipePath = join(dir, 'perm')
      process.env.PERCLST_PERMISSION_PIPE = pipePath
      writeFileSync(`${pipePath}.req`, JSON.stringify({ tool_name: 'Bash', input: {} }))
      setupContainer({ config: buildTestConfig(dir) })

      const service = container.resolve<PermissionPipeService>(TOKENS.PermissionPipeService)
      const req = service.pollRequest()

      expect(req).toEqual({ tool_name: 'Bash', input: {} })
    })

    it('respond writes result to res file', () => {
      const pipePath = join(dir, 'perm')
      process.env.PERCLST_PERMISSION_PIPE = pipePath
      setupContainer({ config: buildTestConfig(dir) })

      const service = container.resolve<PermissionPipeService>(TOKENS.PermissionPipeService)
      service.respond({ behavior: 'allow', updatedInput: {} })

      const content = JSON.parse(readFileSync(`${pipePath}.res`, 'utf-8'))
      expect(content.behavior).toBe('allow')
    })
  })

  describe('error path', () => {
    it('propagates exception when service throws', async () => {
      const ttyStub: TtyInfra = {
        openTty: vi.fn().mockReturnValue(42),
        writeTty: vi.fn(),
        readTty: vi.fn().mockImplementation(() => {
          throw new Error('socket read error')
        }),
        closeTty: vi.fn()
      }
      setupContainer({ config: buildTestConfig(dir), infras: { ttyInfra: ttyStub } })

      await expect(executeAskPermission({ tool_name: 'Bash', input: {} })).rejects.toThrow(
        'socket read error'
      )
    })
  })
})

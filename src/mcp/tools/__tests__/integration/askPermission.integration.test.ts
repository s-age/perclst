import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeAskPermission } from '../../askPermission'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/cli/commands/__tests__/integration/helpers'
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

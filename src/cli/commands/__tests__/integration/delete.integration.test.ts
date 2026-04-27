import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { deleteCommand } from '../../delete'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout } from '@src/utils/output'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('deleteCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // create prerequisite session
    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('session JSON ファイルが削除される', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await deleteCommand(sessionId)

      expect(existsSync(join(dir, `${sessionId}.json`))).toBe(false)
    })

    it('stdout に Session deleted: <id> が出力される', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await deleteCommand(sessionId)

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`Session deleted: ${sessionId}`)
    })
  })

  describe('error path', () => {
    it('存在しない sessionId は process.exit(1) になる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(deleteCommand('nonexistent-id')).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})

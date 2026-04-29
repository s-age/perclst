import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { tagCommand } from '../../tag'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout } from '@src/utils/output'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('tagCommand (integration)', () => {
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
    it('single label is saved to session.metadata.labels', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await tagCommand(sessionId, ['myLabel'])

      const session = JSON.parse(readFileSync(join(dir, `${sessionId}.json`), 'utf8')) as Session
      expect(session.metadata.labels).toEqual(['myLabel'])
    })

    it('multiple labels are saved correctly', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await tagCommand(sessionId, ['a', 'b'])

      const session = JSON.parse(readFileSync(join(dir, `${sessionId}.json`), 'utf8')) as Session
      expect(session.metadata.labels).toEqual(['a', 'b'])
    })

    it('Labels set: <id> is printed to stdout', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await tagCommand(sessionId, ['hello'])

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`Labels set: ${sessionId}`)
    })
  })

  describe('error path', () => {
    it('nonexistent sessionId calls process.exit(1)', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(tagCommand('nonexistent-id', ['label'])).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})

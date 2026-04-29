import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { startCommand } from '@src/cli/commands/start'
import { renameCommand } from '@src/cli/commands/rename'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('renameCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // Create prerequisite session
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
    it('name is saved to session.name', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await renameCommand(sessionId, 'new name', {})

      const session = JSON.parse(readFileSync(join(dir, `${sessionId}.json`), 'utf8')) as Session
      expect(session.name).toBe('new name')
    })

    it('metadata.labels is also updated when --labels is specified together', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await renameCommand(sessionId, 'labelled name', { labels: ['x', 'y'] })

      const session = JSON.parse(readFileSync(join(dir, `${sessionId}.json`), 'utf8')) as Session
      expect(session.metadata.labels).toEqual(['x', 'y'])
    })

    it('confirmIfDuplicateName executes the findByName callback', async () => {
      setupContainer({ config: buildTestConfig(dir) })
      vi.mocked(confirmIfDuplicateName).mockImplementation(async (_name, findByName) => {
        await findByName(_name)
      })

      await renameCommand(sessionId, 'new name', {})

      expect(vi.mocked(confirmIfDuplicateName)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('process.exit(0) is called when confirmIfDuplicateName throws UserCancelledError', async () => {
      setupContainer({ config: buildTestConfig(dir) })
      vi.mocked(confirmIfDuplicateName).mockRejectedValue(new UserCancelledError())

      await expect(renameCommand(sessionId, 'any name', {})).rejects.toThrow('exit')

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('Cancelled. is printed when confirmIfDuplicateName throws UserCancelledError', async () => {
      setupContainer({ config: buildTestConfig(dir) })
      vi.mocked(confirmIfDuplicateName).mockRejectedValue(new UserCancelledError())

      await expect(renameCommand(sessionId, 'any name', {})).rejects.toThrow('exit')

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('process.exit(1) is called for nonexistent sessionId', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(renameCommand('nonexistent-id', 'any name', {})).rejects.toThrow('exit')

      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { importCommand } from '../../import'
import { setupContainer } from '@src/core/di/setup'
import {
  makeTmpDir,
  buildTestConfig,
  buildFsInfraWithHome,
  makeClaudeSessionJsonl,
  setupClaudeSessionFixture
} from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { confirmIfDuplicateName } from '@src/cli/prompt'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('importCommand (integration)', () => {
  const CLAUDE_SESSION_ID = 'claude-session-abc123'
  let dir: string
  let cleanup: () => void
  let fakeHome: string

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    fakeHome = mkdtempSync(join(tmpdir(), 'fake-home-'))
    setupClaudeSessionFixture(fakeHome, CLAUDE_SESSION_ID, process.cwd(), makeClaudeSessionJsonl())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    rmSync(fakeHome, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('outputs "Imported: <id>" to stdout', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Imported:'))
    })

    it('outputs "  Claude session: <claude_session_id>" to stdout', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`  Claude session: ${CLAUDE_SESSION_ID}`)
    })

    it('when --name is specified, confirmIfDuplicateName executes the findByName callback', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })
      vi.mocked(confirmIfDuplicateName).mockImplementation(async (_name, findByName) => {
        await findByName(_name)
      })

      await importCommand(CLAUDE_SESSION_ID, { name: 'my-session' })

      expect(vi.mocked(confirmIfDuplicateName)).toHaveBeenCalled()
    })

    it('when --labels is specified, labels are passed to import', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, { labels: ['foo', 'bar'] })

      const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(files).toHaveLength(1)
      const session = JSON.parse(readFileSync(join(dir, files[0]), 'utf-8'))
      expect(session.metadata.labels).toEqual(['foo', 'bar'])
    })
  })

  describe('error path', () => {
    it('when UserCancelledError occurs, process.exit(0) and "Cancelled." are output', async () => {
      vi.mocked(confirmIfDuplicateName).mockRejectedValue(new UserCancelledError())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await expect(importCommand(CLAUDE_SESSION_ID, { name: 'test' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('when Generic Error occurs, process.exit(1) and "Failed to import session" are output', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await expect(importCommand('nonexistent-session', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Failed to import session',
        expect.any(Error)
      )
    })
  })
})

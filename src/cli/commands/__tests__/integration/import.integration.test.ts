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
    it('stdout に "Imported: <id>" が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Imported:'))
    })

    it('stdout に "  Claude session: <claude_session_id>" が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`  Claude session: ${CLAUDE_SESSION_ID}`)
    })

    it('--name 指定のとき confirmIfDuplicateName が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await importCommand(CLAUDE_SESSION_ID, { name: 'my-session' })

      expect(vi.mocked(confirmIfDuplicateName)).toHaveBeenCalled()
    })

    it('--labels 指定のとき import に labels が渡される', async () => {
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
    it('UserCancelledError のとき process.exit(0) と "Cancelled." が出る', async () => {
      vi.mocked(confirmIfDuplicateName).mockRejectedValue(new UserCancelledError())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await expect(importCommand(CLAUDE_SESSION_ID, { name: 'test' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('Generic Error のとき process.exit(1) と "Failed to import session" が出る', async () => {
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

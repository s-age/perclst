import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { startCommand } from '../../start'
import { rewindCommand } from '../../rewind'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  makeTmpDir,
  buildTestConfig,
  buildFsInfraWithHome,
  makeClaudeSessionJsonl,
  setupClaudeSessionFixture
} from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printRewindList } from '@src/cli/view/rewindDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/rewindDisplay')

describe('rewindCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string
  let fakeHome: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    fakeHome = mkdtempSync(join(tmpdir(), 'fake-home-'))
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    rmSync(fakeHome, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('--list: printRewindList is called with the mapped turns when turns exist', async () => {
      setupClaudeSessionFixture(
        fakeHome,
        sessionId,
        process.cwd(),
        makeClaudeSessionJsonl({ uuid: 'uuid-1', text: 'first assistant turn' })
      )
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await rewindCommand(sessionId, undefined, { list: true })

      expect(vi.mocked(printRewindList)).toHaveBeenCalledWith(
        [{ index: 0, uuid: 'uuid-1', text: 'first assistant turn' }],
        120
      )
    })

    it('--list: stdout.print "No assistant turns found." when no turns exist', async () => {
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), '')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await rewindCommand(sessionId, undefined, { list: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No assistant turns found.')
    })

    it('index=1: a new session JSON file is created in the sessions directory', async () => {
      setupClaudeSessionFixture(
        fakeHome,
        sessionId,
        process.cwd(),
        makeClaudeSessionJsonl({ uuid: 'uuid-0', text: 'turn 0' }) +
          '\n' +
          makeClaudeSessionJsonl({ uuid: 'uuid-1', text: 'turn 1' })
      )
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await rewindCommand(sessionId, '1', {})

      const jsonFiles = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(jsonFiles).toHaveLength(2)
    })
  })

  describe('error path', () => {
    it('no index and no --list causes process.exit(1)', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(rewindCommand(sessionId, undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('no index and no --list prints "Either --list or an index argument is required"', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(rewindCommand(sessionId, undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Either --list or an index argument is required'
      )
    })

    it('nonexistent sessionId causes process.exit(1)', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(rewindCommand('nonexistent-id', undefined, { list: true })).rejects.toThrow(
        'exit'
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('out-of-range index causes process.exit(1)', async () => {
      setupClaudeSessionFixture(
        fakeHome,
        sessionId,
        process.cwd(),
        makeClaudeSessionJsonl({ uuid: 'uuid-0', text: 'only turn' })
      )
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await expect(rewindCommand(sessionId, '5', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('out-of-range index prints the RangeError message', async () => {
      setupClaudeSessionFixture(
        fakeHome,
        sessionId,
        process.cwd(),
        makeClaudeSessionJsonl({ uuid: 'uuid-0', text: 'only turn' })
      )
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await expect(rewindCommand(sessionId, '5', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Index 5 is out of range (session has 1 assistant turns)'
      )
    })

    it('ValidationError causes process.exit(1)', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      // sessionId is required by schema; undefined triggers ValidationError
      await expect(rewindCommand(undefined, undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError prints "Invalid arguments:" prefix', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(rewindCommand(undefined, undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })
  })
})

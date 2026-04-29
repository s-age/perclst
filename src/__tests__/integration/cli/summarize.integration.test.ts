import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { startCommand } from '@src/cli/commands/start'
import { summarizeCommand } from '@src/cli/commands/summarize'
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
import { printSummarizeTable, printSummarizeJson } from '@src/cli/view/summarizeDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/summarizeDisplay')

describe('summarizeCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let fakeHome: string

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    fakeHome = mkdtempSync(join(tmpdir(), 'fake-home-'))
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
    it('No sessions: stdout.print("No sessions found") is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await summarizeCommand({})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No sessions found')
    })

    it('printSummarizeTable is called in text format', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true })

      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const sessionId = file.replace('.json', '')
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await summarizeCommand({})

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })

    it('printSummarizeJson is called with --format json', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await summarizeCommand({ format: 'json' })

      expect(vi.mocked(printSummarizeJson)).toHaveBeenCalled()
    })

    it('matched sessions pass to printSummarizeTable with --label filter', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true, labels: ['keep'] })

      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const sessionId = file.replace('.json', '')
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await summarizeCommand({ label: 'keep' })

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })

    it('matched sessions pass to printSummarizeTable with --like filter', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true, name: 'my-special-session' })

      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const sessionId = file.replace('.json', '')
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await summarizeCommand({ like: 'my-special' })

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('ValidationError: process.exit(1) and Failed to summarize sessions output', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(summarizeCommand({ format: 'invalid' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Failed to summarize sessions',
        expect.any(Error)
      )
    })
  })
})

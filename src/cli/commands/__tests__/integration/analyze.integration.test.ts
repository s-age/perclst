import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { startCommand } from '../../start'
import { analyzeCommand } from '../../analyze'
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
import { stderr } from '@src/utils/output'
import {
  printAnalyzeText,
  printAnalyzeJson,
  printAnalyzeDetail
} from '@src/cli/view/analyzeDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/analyzeDisplay')

describe('analyzeCommand (integration)', () => {
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

    // 前提セッションを startCommand で作成する
    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })
    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')

    setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
  })

  afterEach(() => {
    cleanup()
    rmSync(fakeHome, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('デフォルト（text 形式）で printAnalyzeText が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await analyzeCommand(sessionId, {})

      expect(vi.mocked(printAnalyzeText)).toHaveBeenCalled()
    })

    it('--format json で printAnalyzeJson が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await analyzeCommand(sessionId, { format: 'json' })

      expect(vi.mocked(printAnalyzeJson)).toHaveBeenCalled()
    })

    it('--printDetail で printAnalyzeDetail が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await analyzeCommand(sessionId, { printDetail: true })

      expect(vi.mocked(printAnalyzeDetail)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('存在しない sessionId は process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) }
      })

      await expect(analyzeCommand('nonexistent-id', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき process.exit(1) と Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) }
      })

      await expect(analyzeCommand(sessionId, { format: 'invalid' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })
  })
})

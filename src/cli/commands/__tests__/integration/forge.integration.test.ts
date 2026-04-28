import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { forgeCommand } from '../../forge'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

// path.resolve in forge.ts resolves relative to process.cwd(), so the plan file
// must live in the real project tree, not in the session tmpdir
const PLAN_PATH = 'plans/forge-integration-test.md'
const PLAN_ABS = join(process.cwd(), PLAN_PATH)

describe('forgeCommand (integration)', () => {
  let dir: string
  let cleanup: () => void

  function plantPlanFile(): string {
    mkdirSync(join(process.cwd(), 'plans'), { recursive: true })
    writeFileSync(PLAN_ABS, '# forge integration test plan')
    return PLAN_PATH
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    try {
      unlinkSync(PLAN_ABS)
    } catch {
      // file was not planted in this test
    }
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('plan ファイルあり → printResponse が呼ばれる', async () => {
      const planPath = plantPlanFile()
      const stub = buildClaudeCodeStub(makeResultLines('pipeline generated'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forgeCommand(planPath, {})

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('--prompt オプションがあるとき buildArgs にプロンプトが含まれる', async () => {
      const planPath = plantPlanFile()
      const stub = buildClaudeCodeStub(makeResultLines('pipeline generated'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forgeCommand(planPath, { prompt: 'also do X' })

      const [action] = vi.mocked(stub.buildArgs).mock.calls[0]
      expect(action.prompt).toContain('also do X')
    })
  })

  describe('error path', () => {
    function makeThrowingStub(err: Error): ReturnType<typeof buildClaudeCodeStub> {
      const stub = buildClaudeCodeStub([])
      ;(stub.runClaude as ReturnType<typeof vi.fn>).mockImplementation(
        async function* (): AsyncGenerator<string> {
          yield* [] as string[]
          throw err
        }
      )
      return stub
    }

    it('plan ファイルなし → process.exit(1) になる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(forgeCommand('plans/nonexistent.md', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('plan ファイルなし → stderr に Plan file not found が出る', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(forgeCommand('plans/nonexistent.md', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Plan file not found: plans/nonexistent.md'
      )
    })

    it('ValidationError のとき process.exit(1) になる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(forgeCommand('not-a-plans-path.txt', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき Invalid arguments が stderr に出る', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(forgeCommand('not-a-plans-path.txt', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })

    it('Generic Error のとき process.exit(1) になる', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new Error('spawn failed')) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき stderr に Failed to forge pipeline が出る', async () => {
      const planPath = plantPlanFile()
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to forge pipeline', err)
    })

    it('UserCancelledError のとき process.exit(0) になる', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('UserCancelledError のとき stderr に Cancelled が出る', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('RateLimitError(resetInfo あり) のとき process.exit(1) になる', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit(1) になる', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      const planPath = plantPlanFile()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(forgeCommand(planPath, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})

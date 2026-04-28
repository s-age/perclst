import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { reviewCommand } from '../../review'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('reviewCommand (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('targetPath ありのとき printResponse が呼ばれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('review done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await reviewCommand('/path/to/file.ts', {})

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('targetPath なしのとき printResponse が呼ばれる（デフォルト動作）', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('review done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await reviewCommand(undefined, {})

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
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

    it('Generic Error のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new Error('spawn failed')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき stderr に Failed to run review が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run review', err)
    })

    it('ValidationError のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき stderr に Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})

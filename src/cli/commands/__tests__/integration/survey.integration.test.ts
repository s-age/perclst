import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { surveyCommand } from '../../survey'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('surveyCommand (integration)', () => {
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
    it('query 実行後に printResponse が呼ばれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('survey done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand('What is the architecture?', { outputOnly: true })

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('--refresh フラグのとき buildArgs に Bash が含まれる allowedTools が渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('refreshed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand(undefined, { refresh: true, outputOnly: true })

      const [action] = vi.mocked(stub.buildArgs).mock.calls[0]
      expect(action.allowedTools).toContain('Bash')
    })

    it('--refresh なし（デフォルト）のとき buildArgs の allowedTools に Bash が含まれない', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('survey done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand('What is the architecture?', { outputOnly: true })

      const [action] = vi.mocked(stub.buildArgs).mock.calls[0]
      expect(action.allowedTools).not.toContain('Bash')
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

    it('query も --refresh もないとき process.exit(1) になる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(surveyCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('query も --refresh もないとき A query is required メッセージが出る', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(surveyCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'A query is required. Use --refresh to update catalogs instead.'
      )
    })

    it('ValidationError のとき process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき Invalid arguments メッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })

    it('Generic Error のとき process.exit(1) になる', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき Failed to run survey メッセージが出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run survey', err)
    })
  })
})

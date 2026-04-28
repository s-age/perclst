import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retrieveCommand } from '../../retrieve'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('retrieveCommand (integration)', () => {
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
    it('keywords が task 文字列として runClaude の prompt 引数に含まれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('found results'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await retrieveCommand(['typescript', 'vitest'])

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string[],
        string,
        ...unknown[]
      ]
      expect(prompt).toContain('typescript')
    })

    it('printResponse が呼ばれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('found results'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await retrieveCommand(['typescript'])

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

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき stderr に Failed to retrieve knowledge が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to retrieve knowledge', err)
    })

    it('ValidationError のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき stderr に Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(retrieveCommand(['test'])).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})

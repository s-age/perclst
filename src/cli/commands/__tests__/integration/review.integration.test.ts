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
    it('When targetPath is provided, printResponse is called', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('review done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await reviewCommand('/path/to/file.ts', {})

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('When targetPath is not provided, printResponse is called (default behavior)', async () => {
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

    it('When Generic Error is thrown, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new Error('spawn failed')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('When Generic Error is thrown, Failed to run review is printed to stderr', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run review', err)
    })

    it('When ValidationError is thrown, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('When ValidationError is thrown, Invalid arguments is printed to stderr', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('When RateLimitError with resetInfo is thrown, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('When RateLimitError with resetInfo is thrown, a message containing Resets is printed', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('When RateLimitError without resetInfo is thrown, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(reviewCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('When RateLimitError without resetInfo is thrown, a message without Resets is printed', async () => {
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

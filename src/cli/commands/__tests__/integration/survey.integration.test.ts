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
    it('printResponse is called after query execution', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('survey done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand('What is the architecture?', { outputOnly: true })

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('when --refresh flag is set, runClaude args contain --allowedTools with Bash', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('refreshed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand(undefined, { refresh: true, outputOnly: true })

      const [args] = vi.mocked(stub.runClaude).mock.calls[0] as [string[], ...unknown[]]
      expect(args).toContain('--allowedTools')
      expect(args).toContain('Bash')
    })

    it('when no --refresh flag (default), runClaude args do not contain Bash', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('survey done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await surveyCommand('What is the architecture?', { outputOnly: true })

      const [args] = vi.mocked(stub.runClaude).mock.calls[0] as [string[], ...unknown[]]
      expect(args).not.toContain('Bash')
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

    it('when neither query nor --refresh is provided, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(surveyCommand(undefined, {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when neither query nor --refresh is provided, "A query is required" message is displayed', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(surveyCommand(undefined, {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'A query is required. Use --refresh to update catalogs instead.'
      )
    })

    it('when ValidationError is thrown, process.exit(1) is called', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when ValidationError is thrown, "Invalid arguments" message is displayed', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('when RateLimitError with resetInfo is thrown, process.exit(1) is called', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when RateLimitError with resetInfo is thrown, message containing "Resets" is displayed', async () => {
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

    it('when RateLimitError without resetInfo is thrown, process.exit(1) is called', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(
        surveyCommand('What is the architecture?', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when RateLimitError without resetInfo is thrown, message without "Resets" is displayed', async () => {
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

    it('when Generic Error is thrown, process.exit(1) is called', async () => {
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

    it('when Generic Error is thrown, "Failed to run survey" message is displayed', async () => {
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

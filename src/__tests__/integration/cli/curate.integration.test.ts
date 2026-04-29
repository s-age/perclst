import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { curateCommand } from '@src/cli/commands/curate'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  buildKnowledgeReaderStub,
  makeTmpDir,
  buildTestConfig
} from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('curateCommand (integration)', () => {
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

  describe('happy path', () => {
    it('when no drafts exist, "No draft entries to curate." is printed to stdout', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { knowledgeReaderInfra: buildKnowledgeReaderStub(false) }
      })

      await curateCommand()

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No draft entries to curate.')
    })

    it('when drafts exist, printResponse is called', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('curated'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: stub, knowledgeReaderInfra: buildKnowledgeReaderStub(true) }
      })

      await curateCommand()

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('when Generic Error occurs, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new Error('spawn failed')),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when Generic Error occurs, "Failed to curate knowledge" is printed to stderr', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(err),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to curate knowledge', err)
    })

    it('when ValidationError occurs, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when ValidationError occurs, "Invalid arguments" is printed to stderr', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('when RateLimitError with resetInfo occurs, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when RateLimitError with resetInfo occurs, a message containing "Resets" is printed', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('when RateLimitError without resetInfo occurs, process.exit is called with 1', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when RateLimitError without resetInfo occurs, a message without "Resets" is printed', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          knowledgeReaderInfra: buildKnowledgeReaderStub(true)
        }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})

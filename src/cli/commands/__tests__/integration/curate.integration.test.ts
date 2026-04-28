import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { curateCommand } from '../../curate'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'

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

  function makeKnowledgeStub(hasDraft: boolean): KnowledgeSearchService {
    return {
      hasDraftEntries: vi.fn().mockReturnValue(hasDraft),
      search: vi.fn()
    } as unknown as KnowledgeSearchService
  }

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
    it('draft なしのとき "No draft entries to curate." が stdout に出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: { knowledgeSearchService: makeKnowledgeStub(false) }
      })

      await curateCommand()

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No draft entries to curate.')
    })

    it('draft ありのとき printResponse が呼ばれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('curated'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: stub },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await curateCommand()

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('Generic Error のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new Error('spawn failed')) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき stderr に Failed to curate knowledge が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to curate knowledge', err)
    })

    it('ValidationError のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき stderr に Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit が 1 で呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) },
        services: { knowledgeSearchService: makeKnowledgeStub(true) }
      })

      await expect(curateCommand()).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})

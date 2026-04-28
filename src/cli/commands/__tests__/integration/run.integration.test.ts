import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { confirm } from '@src/cli/prompt'
import { printStreamEvent } from '@src/cli/view/display'
import { RateLimitError } from '@src/errors/rateLimitError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { APIError } from '@src/errors/apiError'
import type { AbortService } from '@src/services/abortService'
import type { PipelineFileService } from '@src/services/pipelineFileService'
import type { PipelineService, PipelineTaskResult } from '@src/services/pipelineService'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

/** パスの拡張子バリデーションを通過する最小パス。ファイルは不要（loadRawPipeline をモック）。 */
const PIPELINE_PATH = 'pipeline.yaml'

/** parsePipeline を通過する最小パイプライン構造 */
const MINIMAL_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'do something' }]
}

// PipelineFileService is stubbed at the service level because its underlying GitInfra
// operations (getDiffStat, getHead, moveToDone, commitMove) fail in a non-git tmpdir.
// Pattern follows inspect.integration.test.ts.
function makePipelineFileServiceStub(opts?: {
  diffStat?: string | null
  rawPipeline?: unknown
}): PipelineFileService {
  return {
    getDiffStat: vi.fn(() => opts?.diffStat ?? null),
    getHead: vi.fn(() => null),
    getDiffSummary: vi.fn(() => null),
    loadRawPipeline: vi.fn(() => opts?.rawPipeline ?? MINIMAL_PIPELINE_RAW),
    savePipeline: vi.fn(),
    moveToDone: vi.fn(() => null),
    commitMove: vi.fn(),
    cleanTmpDir: vi.fn()
  } as unknown as PipelineFileService
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

// PipelineMaxRetriesError is thrown internally by pipelineDomain's rejection handling
// and cannot be triggered through claudeCodeInfra without a complex pipeline+rejection
// fixture. This is the only approved service-level exception for pipelineService in
// this file.
function makePipelineServiceThrowingStub(err: Error): PipelineService {
  return {
    run: vi.fn(async function* (): AsyncGenerator<PipelineTaskResult> {
      yield* [] as PipelineTaskResult[]
      throw err
    })
  } as unknown as PipelineService
}

describe('runCommand (integration)', () => {
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
    it('パイプライン完了時に "Running pipeline:" が stdout に出力される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('task done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: stub },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Running pipeline: 1 task(s)')
    })

    it('パイプライン完了時に "Pipeline complete." が stdout に出力される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('task done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: stub },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })

    it('uncommitted changes で confirm が No のとき stdout に Aborted が出力される', async () => {
      vi.mocked(confirm).mockResolvedValue(false)
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: makePipelineFileServiceStub({ diffStat: 'M src/foo.ts' }) }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')
    })

    it('uncommitted changes で confirm が No のとき process.exit(0) が呼ばれる', async () => {
      vi.mocked(confirm).mockResolvedValue(false)
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: makePipelineFileServiceStub({ diffStat: 'M src/foo.ts' }) }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('--outputOnly のとき printStreamEvent が呼ばれない', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('task done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: stub },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      await runCommand(PIPELINE_PATH, { outputOnly: true, batch: true })

      expect(vi.mocked(printStreamEvent)).not.toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('不正な拡張子のパスのとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand('invalid-path.txt', { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('不正な拡張子のパスのとき stderr に Invalid arguments が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand('invalid-path.txt', { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })

    it('RateLimitError(resetInfo あり) のとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })

    it('PipelineMaxRetriesError のとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub(),
          pipelineService: makePipelineServiceThrowingStub(new PipelineMaxRetriesError(0, 3))
        }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('PipelineMaxRetriesError のとき stderr に error.message が出力される', async () => {
      const err = new PipelineMaxRetriesError(0, 3)
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub(),
          pipelineService: makePipelineServiceThrowingStub(err)
        }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(err.message)
    })

    it('loadRawPipeline が例外を投げるとき process.exit(1) が呼ばれる', async () => {
      const fileService = makePipelineFileServiceStub()
      ;(fileService.loadRawPipeline as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('file not found')
      })
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: fileService }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('loadRawPipeline が例外を投げるとき stderr に "Failed to read pipeline file:" が出力される', async () => {
      const fileService = makePipelineFileServiceStub()
      ;(fileService.loadRawPipeline as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('file not found')
      })
      setupContainer({
        config: buildTestConfig(dir),
        services: { pipelineFileService: fileService }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read pipeline file:')
      )
    })

    it('APIError のとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new APIError('api failed')) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('APIError のとき stderr に "Pipeline failed:" が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new APIError('api failed')) },
        services: { pipelineFileService: makePipelineFileServiceStub() }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline failed:')
      )
    })

    it('AbortService が abort 済みのとき process.exit(130) が呼ばれる', async () => {
      const abortedService = {
        signal: { aborted: true },
        abort: vi.fn()
      } as unknown as AbortService
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub(),
          pipelineService: makePipelineServiceThrowingStub(new Error('cancelled')),
          abortService: abortedService
        }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(130)
    })

    it('AbortService が abort 済みのとき stdout に "Aborted." が出力される', async () => {
      const abortedService = {
        signal: { aborted: true },
        abort: vi.fn()
      } as unknown as AbortService
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub(),
          pipelineService: makePipelineServiceThrowingStub(new Error('cancelled')),
          abortService: abortedService
        }
      })

      try {
        await runCommand(PIPELINE_PATH, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')
    })
  })
})

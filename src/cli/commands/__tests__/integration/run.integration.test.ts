import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  buildGitInfraStub,
  buildFileMoveInfraStub,
  buildShellInfraStub,
  buildFsInfraWithCwd,
  writePipelineFixture,
  makeTmpDir,
  buildTestConfig
} from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { confirm } from '@src/cli/prompt'
import { printStreamEvent } from '@src/cli/view/display'
import { RawExitError } from '@src/errors/rawExitError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { APIError } from '@src/errors/apiError'
import type { AbortService } from '@src/services/abortService'
import type { PipelineService, PipelineTaskResult } from '@src/services/pipelineService'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

/** parsePipeline を通過する最小パイプライン構造 */
const MINIMAL_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'do something' }]
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
  let pipelinePath: string

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    pipelinePath = writePipelineFixture(dir, MINIMAL_PIPELINE_RAW)
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
        infras: {
          claudeCodeInfra: stub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Running pipeline: 1 task(s)')
    })

    it('パイプライン完了時に "Pipeline complete." が stdout に出力される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('task done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: stub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })

    it('uncommitted changes で confirm が No のとき stdout に Aborted が出力される', async () => {
      vi.mocked(confirm).mockResolvedValue(false)
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub({ diffStat: 'M src/foo.ts' }),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')
    })

    it('uncommitted changes で confirm が No のとき process.exit(0) が呼ばれる', async () => {
      vi.mocked(confirm).mockResolvedValue(false)
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub({ diffStat: 'M src/foo.ts' }),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('--outputOnly のとき printStreamEvent が呼ばれない', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('task done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: stub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { outputOnly: true, batch: true })

      expect(vi.mocked(printStreamEvent)).not.toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('不正な拡張子のパスのとき process.exit(1) が呼ばれる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() }
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
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() }
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
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
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
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
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
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: {
          pipelineService: makePipelineServiceThrowingStub(new PipelineMaxRetriesError(0, 3))
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('PipelineMaxRetriesError のとき stderr に error.message が出力される', async () => {
      const err = new PipelineMaxRetriesError(0, 3)
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: {
          pipelineService: makePipelineServiceThrowingStub(err)
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(err.message)
    })

    it('loadRawPipeline が例外を投げるとき process.exit(1) が呼ばれる', async () => {
      const nonexistentPath = join(dir, 'nonexistent.yaml')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() }
      })

      try {
        await runCommand(nonexistentPath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('loadRawPipeline が例外を投げるとき stderr に "Failed to read pipeline file:" が出力される', async () => {
      const nonexistentPath = join(dir, 'nonexistent.yaml')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() }
      })

      try {
        await runCommand(nonexistentPath, { batch: true })
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
        infras: {
          claudeCodeInfra: makeThrowingStub(new APIError('api failed')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('APIError のとき stderr に "Pipeline failed:" が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new APIError('api failed')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
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
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: {
          pipelineService: makePipelineServiceThrowingStub(new Error('cancelled')),
          abortService: abortedService
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
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
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: {
          pipelineService: makePipelineServiceThrowingStub(new Error('cancelled')),
          abortService: abortedService
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')
    })
  })

  describe('RawExitError classification', () => {
    it('RawExitError の stderr に rate limit メッセージがあるとき RateLimitError として処理される', async () => {
      const rawErr = new RawExitError(1, "you've hit your limit. Resets at 2026-12-31")
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(rawErr),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Claude usage limit reached')
      )
    })

    it('RawExitError の stderr に rate limit 以外のメッセージがあるとき APIError として処理される', async () => {
      const rawErr = new RawExitError(1, 'some unexpected error')
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(rawErr),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      try {
        await runCommand(pipelinePath, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline failed:')
      )
    })
  })

  describe('script rejection flow', () => {
    it('script 失敗 + rejected.to のとき agent が retry された後 PipelineMaxRetriesError で exit(1)', async () => {
      const rejectionPipeline = {
        tasks: [
          { type: 'agent', name: 'fixer', task: 'fix it' },
          { type: 'script', command: 'test', rejected: { to: 'fixer', max_retries: 1 } }
        ]
      }
      const path = writePipelineFixture(dir, rejectionPipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 1, stdout: 'test failed', stderr: '' })
        }
      })

      try {
        await runCommand(path, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
      expect(claudeStub.runClaude).toHaveBeenCalledTimes(2)
    })
  })

  describe('agent limit exceeded', () => {
    it('max_messages 超過時にパイプラインが正常完了する', async () => {
      const limitPipeline = {
        tasks: [{ type: 'agent', task: 'do something', max_messages: 1 }]
      }
      const path = writePipelineFixture(dir, limitPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })

    it('max_context_tokens 超過時にパイプラインが正常完了する', async () => {
      const limitPipeline = {
        tasks: [{ type: 'agent', task: 'do something', max_context_tokens: 5 }]
      }
      const path = writePipelineFixture(dir, limitPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })

  describe('agent rejection via feedback file', () => {
    const feedbackDir = join(process.cwd(), '.claude', 'tmp')

    afterEach(() => {
      rmSync(feedbackDir, { recursive: true, force: true })
    })

    it('agent の rejected + feedback file があるとき retry 後にパイプラインが完了する', async () => {
      mkdirSync(feedbackDir, { recursive: true })
      writeFileSync(join(feedbackDir, 'coder'), 'assertion error in test.ts')

      const rejectionPipeline = {
        tasks: [
          {
            type: 'agent',
            name: 'coder',
            task: 'write code',
            rejected: { to: 'coder', max_retries: 1 }
          }
        ]
      }
      const path = writePipelineFixture(dir, rejectionPipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(claudeStub.runClaude).toHaveBeenCalledTimes(2)
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })

  describe('procedure loading', () => {
    it('task に procedure を指定するとローカル procedure が読み込まれる', async () => {
      mkdirSync(join(dir, 'procedures'), { recursive: true })
      writeFileSync(join(dir, 'procedures', 'test-proc.md'), '# Test procedure')

      const procPipeline = {
        tasks: [{ type: 'agent', task: 'do something', procedure: 'test-proc' }]
      }
      const path = writePipelineFixture(dir, procPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          fsInfra: buildFsInfraWithCwd(dir)
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })
})

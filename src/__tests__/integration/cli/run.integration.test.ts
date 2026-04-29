import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { runCommand } from '@src/cli/commands/run'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  buildGitInfraStub,
  buildFileMoveInfraStub,
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

/** Minimal pipeline structure that passes parsePipeline */
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
    it('outputs "Running pipeline:" to stdout when pipeline completes', async () => {
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

    it('outputs "Pipeline complete." to stdout when pipeline completes', async () => {
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

    it('outputs Aborted to stdout when confirm returns No for uncommitted changes', async () => {
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

    it('calls process.exit(0) when confirm returns No for uncommitted changes', async () => {
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

    it('does not call printStreamEvent with --outputOnly flag', async () => {
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
    it('calls process.exit(1) when path has invalid extension', async () => {
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

    it('outputs "Invalid arguments:" to stderr when path has invalid extension', async () => {
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

    it('calls process.exit(1) when RateLimitError is thrown with resetInfo', async () => {
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

    it('outputs message containing "Resets:" when RateLimitError is thrown with resetInfo', async () => {
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

    it('calls process.exit(1) when RateLimitError is thrown without resetInfo', async () => {
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

    it('outputs message without "Resets:" when RateLimitError is thrown without resetInfo', async () => {
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

    it('calls process.exit(1) when PipelineMaxRetriesError is thrown', async () => {
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

    it('outputs error.message to stderr when PipelineMaxRetriesError is thrown', async () => {
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

    it('calls process.exit(1) when loadRawPipeline throws an exception', async () => {
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

    it('outputs "Failed to read pipeline file:" to stderr when loadRawPipeline throws an exception', async () => {
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

    it('calls process.exit(1) when APIError is thrown', async () => {
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

    it('outputs "Pipeline failed:" to stderr when APIError is thrown', async () => {
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

    it('calls process.exit(130) when AbortService has been aborted', async () => {
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

    it('outputs "Aborted." to stdout when AbortService has been aborted', async () => {
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
    it('processes as RateLimitError when RawExitError stderr contains rate limit message', async () => {
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

    it('processes as APIError when RawExitError stderr contains non-rate-limit message', async () => {
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
})

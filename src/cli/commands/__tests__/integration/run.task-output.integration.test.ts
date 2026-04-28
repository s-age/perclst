import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import {
  makeTmpDir,
  buildTestConfig,
  buildGitInfraStub,
  buildFileMoveInfraStub,
  buildClaudeCodeStub,
  buildShellInfraStub,
  makeResultLines,
  writePipelineFixture,
  writeYamlFixture
} from './helpers'
import { stdout } from '@src/utils/output'
import { printStreamEvent } from '@src/cli/view/display'
import type { PipelineService, PipelineTaskResult } from '@src/services/pipelineService'
import type { AgentStreamEvent } from '@src/types/agent'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

const MINIMAL_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'do something' }]
}

function makePipelineServiceYieldingStub(...results: PipelineTaskResult[]): PipelineService {
  return {
    run: vi.fn(async function* (): AsyncGenerator<PipelineTaskResult> {
      yield* results
    })
  } as unknown as PipelineService
}

function makePipelineServiceWithStreamEventStub(): PipelineService {
  return {
    run: vi.fn(async function* (
      _pipeline: unknown,
      options: { onStreamEvent?: (event: AgentStreamEvent) => void }
    ): AsyncGenerator<PipelineTaskResult> {
      options.onStreamEvent?.({ type: 'thought', thinking: 'streaming...' })
      yield* [] as PipelineTaskResult[]
    })
  } as unknown as PipelineService
}

describe('runCommand task output (integration)', () => {
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

  describe('printTaskResult: script', () => {
    it('exitCode 0 のとき "[script] ok:" を含む行が stdout に出力される', async () => {
      const scriptPipeline = writePipelineFixture(dir, {
        tasks: [{ type: 'script', command: 'echo hi' }]
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 0, stdout: '', stderr: '' })
        }
      })

      await runCommand(scriptPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('[script] ok:'))
    })

    it('exitCode 非 0 のとき "[script] exit 1:" を含む行が stdout に出力される', async () => {
      const scriptPipeline = writePipelineFixture(dir, {
        tasks: [{ type: 'script', command: 'false' }]
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 1, stdout: '', stderr: '' })
        }
      })

      await runCommand(scriptPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('[script] exit 1:')
      )
    })

    it('script の stdout が空でない場合は trimEnd した値が stdout に出力される', async () => {
      const scriptPipeline = writePipelineFixture(dir, {
        tasks: [{ type: 'script', command: 'echo hi' }]
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 0, stdout: 'hello world\n', stderr: '' })
        }
      })

      await runCommand(scriptPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('hello world')
    })

    it('script の stderr が空でない場合は trimEnd した値が stdout に出力される', async () => {
      const scriptPipeline = writePipelineFixture(dir, {
        tasks: [{ type: 'script', command: 'echo hi >&2' }]
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 0, stdout: '', stderr: 'error text\n' })
        }
      })

      await runCommand(scriptPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('error text')
    })
  })

  describe('printTaskResult: task_start', () => {
    it('taskType が "child" のとき "[child]:" を含む行が stdout に出力される', async () => {
      const childPipelineRaw = { tasks: [{ type: 'agent', task: 'child task' }] }
      const mainRaw = { tasks: [{ type: 'child', path: 'child.yaml' }] }
      const mainPipeline = writePipelineFixture(dir, mainRaw)
      writeYamlFixture(join(dir, 'child.yaml'), childPipelineRaw)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(mainPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('[child]:'))
    })

    it('taskType が "child" かつ name あり のとき name が含まれる行が stdout に出力される', async () => {
      const childPipelineRaw = { tasks: [{ type: 'agent', task: 'child task' }] }
      const mainRawNamed = { tasks: [{ type: 'child', name: 'MyChildTask', path: 'child.yaml' }] }
      const mainPipeline = writePipelineFixture(dir, mainRawNamed)
      writeYamlFixture(join(dir, 'child.yaml'), childPipelineRaw)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(mainPipeline, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('MyChildTask'))
    })
  })

  describe('printTaskResult: retry / pipeline_end', () => {
    it('retry result のとき "Task" を含む行が stdout に出力されない', async () => {
      const result: PipelineTaskResult = {
        kind: 'retry',
        taskPath: [],
        taskIndex: 0,
        retryCount: 1,
        maxRetries: 3
      }
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: { pipelineService: makePipelineServiceYieldingStub(result) }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(expect.stringContaining('Task'))
    })

    it('pipeline_end result のとき "Task" を含む行が stdout に出力されない', async () => {
      const result: PipelineTaskResult = {
        kind: 'pipeline_end',
        taskPath: [],
        taskIndex: 0
      }
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: { pipelineService: makePipelineServiceYieldingStub(result) }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(expect.stringContaining('Task'))
    })
  })

  describe('streaming', () => {
    it('outputOnly なしのとき onStreamEvent callback が printStreamEvent を呼ぶ', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { gitInfra: buildGitInfraStub(), fileMoveInfra: buildFileMoveInfraStub() },
        services: { pipelineService: makePipelineServiceWithStreamEventStub() }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(printStreamEvent)).toHaveBeenCalled()
    })
  })
})

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from './helpers'
import { stdout } from '@src/utils/output'
import type { PipelineFileService } from '@src/services/pipelineFileService'
import type { PipelineService, PipelineTaskResult } from '@src/services/pipelineService'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

const PIPELINE_PATH = 'pipeline.yaml'

const MINIMAL_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'do something' }]
}

function makePipelineFileServiceStub(opts?: {
  headValues?: [string | null, string | null]
  diffSummary?: string | null
  moveToDoneResult?: string | null
}): PipelineFileService {
  const headValues = opts?.headValues ?? [null, null]
  let headCallCount = 0
  return {
    getDiffStat: vi.fn(() => null),
    getHead: vi.fn(() => headValues[headCallCount++ % 2]),
    getDiffSummary: vi.fn(() => opts?.diffSummary ?? null),
    loadRawPipeline: vi.fn(() => MINIMAL_PIPELINE_RAW),
    savePipeline: vi.fn(),
    moveToDone: vi.fn(() => opts?.moveToDoneResult ?? null),
    commitMove: vi.fn(),
    cleanTmpDir: vi.fn()
  } as unknown as PipelineFileService
}

function makePipelineServiceYieldingStub(): PipelineService {
  return {
    run: vi.fn(async function* (): AsyncGenerator<PipelineTaskResult> {
      yield* [] as PipelineTaskResult[]
    })
  } as unknown as PipelineService
}

function makePipelineServiceWithChildCallbackStub(childPath: string): PipelineService {
  return {
    run: vi.fn(async function* (
      _pipeline: unknown,
      options: { onChildPipelineDone?: (path: string) => void }
    ): AsyncGenerator<PipelineTaskResult> {
      options.onChildPipelineDone?.(childPath)
      yield* [] as PipelineTaskResult[]
    })
  } as unknown as PipelineService
}

describe('runCommand post-pipeline behavior (integration)', () => {
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

  describe('git diff summary', () => {
    it('headBefore と headAfter が異なるとき "Changes committed during pipeline" が stdout に出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub({
            headValues: ['abc1234567', 'def4567890'],
            diffSummary: '1 file changed'
          }),
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })

    it('headBefore と headAfter が同一のとき diff summary が出力されない', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub({
            headValues: ['abc1234567', 'abc1234567'],
            diffSummary: '1 file changed'
          }),
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })

    it('headBefore が null のとき diff summary が出力されない', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub({
            headValues: [null, 'def4567890'],
            diffSummary: '1 file changed'
          }),
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })
  })

  describe('moveToDone (main pipeline)', () => {
    it('moveToDone がパスを返すとき stdout に "Moved to:" が出力される', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub({
            moveToDoneResult: '/done/pipeline.yaml'
          }),
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })

    it('moveToDone がパスを返すとき commitMove が呼ばれる', async () => {
      const fileService = makePipelineFileServiceStub({
        moveToDoneResult: '/done/pipeline.yaml'
      })
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: fileService,
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(fileService.commitMove).toHaveBeenCalled()
    })

    it('moveToDone が null を返すとき stdout に "Moved to:" が出力されない', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: makePipelineFileServiceStub({ moveToDoneResult: null }),
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })
  })

  describe('cleanTmpDir', () => {
    it('パイプライン完了後に cleanTmpDir が呼ばれる', async () => {
      const fileService = makePipelineFileServiceStub()
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: fileService,
          pipelineService: makePipelineServiceYieldingStub()
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(fileService.cleanTmpDir).toHaveBeenCalled()
    })
  })

  describe('child pipeline', () => {
    it('onChildPipelineDone が呼ばれたとき moveToDone が child パスで呼ばれる', async () => {
      const fileService = makePipelineFileServiceStub()
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: fileService,
          pipelineService: makePipelineServiceWithChildCallbackStub('/child.yaml')
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(fileService.moveToDone).toHaveBeenCalledWith('/child.yaml')
    })

    it('child の moveToDone がパスを返すとき stdout に "Moved to:" が出力される', async () => {
      const childMoveToDone = vi.fn((path: string) =>
        path === '/child.yaml' ? '/done/child.yaml' : null
      )
      const fileService = {
        getDiffStat: vi.fn(() => null),
        getHead: vi.fn(() => null),
        getDiffSummary: vi.fn(() => null),
        loadRawPipeline: vi.fn(() => MINIMAL_PIPELINE_RAW),
        savePipeline: vi.fn(),
        moveToDone: childMoveToDone,
        commitMove: vi.fn(),
        cleanTmpDir: vi.fn()
      } as unknown as PipelineFileService
      setupContainer({
        config: buildTestConfig(dir),
        services: {
          pipelineFileService: fileService,
          pipelineService: makePipelineServiceWithChildCallbackStub('/child.yaml')
        }
      })

      await runCommand(PIPELINE_PATH, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })
  })
})

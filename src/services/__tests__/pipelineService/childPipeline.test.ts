import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline } from '@src/types/pipeline'
import type { IPipelineDomain, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import type { AgentResponse } from '@src/types/agent'
import { PipelineService, type PipelineTaskResult } from '../../pipelineService'

vi.mock('fs')
vi.mock('@src/utils/output', () => ({ debug: { print: vi.fn() } }))

const stubAgentResult = (overrides: Partial<AgentTaskResult> = {}): AgentTaskResult => ({
  taskPath: [],
  taskIndex: 0,
  name: undefined,
  sessionId: 'session-1',
  response: {} as AgentResponse,
  action: 'started',
  ...overrides
})

describe('PipelineService', () => {
  let service: PipelineService
  const mockPipelineDomain: IPipelineDomain = {
    runWithLimit: vi.fn(),
    buildRejectedInstruction: vi.fn(),
    getRejectionFeedback: vi.fn(),
    getWorkingDirectory: vi.fn(),
    resolveRejection: vi.fn(),
    buildExecuteOptions: vi.fn(),
    runAgentTask: vi.fn(),
    findOuterRejectionTarget: vi.fn(),
    resolveScriptRejection: vi.fn()
  }
  const mockScriptDomain: IScriptDomain = {
    run: vi.fn<[string, string], Promise<ScriptResult>>()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockPipelineDomain.getWorkingDirectory).mockReturnValue('/test/cwd')
    vi.mocked(mockPipelineDomain.runAgentTask).mockImplementation(async (_task, taskLocation) =>
      stubAgentResult({ taskIndex: taskLocation.index, taskPath: taskLocation.taskPath })
    )
    service = new PipelineService(mockPipelineDomain, mockScriptDomain)
  })

  describe('child pipeline tasks', () => {
    it('should throw when loadChildPipeline is not provided', async () => {
      const pipeline: Pipeline = { tasks: [{ type: 'child', path: 'sub.json' }] }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline)) events.push(e)
      }).rejects.toThrow('loadChildPipeline is required')
    })

    it('should delegate to child pipeline and emit pipeline_end', async () => {
      const childPipeline: Pipeline = { tasks: [{ type: 'agent', task: 'child work' }] }
      const loadChildPipeline = vi.fn().mockReturnValue(childPipeline)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())

      const pipeline: Pipeline = {
        tasks: [{ type: 'child', path: '/absolute/sub.json', name: 'sub' }]
      }
      const events = await (async (): Promise<PipelineTaskResult[]> => {
        const result: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline, {
          loadChildPipeline,
          pipelineDir: '/absolute'
        }))
          result.push(e)
        return result
      })()

      expect(loadChildPipeline).toHaveBeenCalledWith('/absolute/sub.json')
      expect(events.find((e) => e.kind === 'pipeline_end')).toEqual({
        kind: 'pipeline_end',
        taskPath: [],
        taskIndex: 0
      })
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts[0]).toMatchObject({ taskType: 'child', taskIndex: 0 })
      expect(starts[1]).toMatchObject({ taskType: 'agent', taskPath: [0], taskIndex: 0 })
    })

    it('should resolve relative path against pipelineDir', async () => {
      const childPipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work' }] }
      const loadChildPipeline = vi.fn().mockReturnValue(childPipeline)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())

      const pipeline: Pipeline = { tasks: [{ type: 'child', path: 'sub/child.json' }] }
      const events: PipelineTaskResult[] = []
      for await (const e of service.run(pipeline, { loadChildPipeline, pipelineDir: '/base/dir' }))
        events.push(e)

      expect(loadChildPipeline).toHaveBeenCalledWith('/base/dir/sub/child.json')
    })
  })

  describe('child pipeline callbacks', () => {
    it('should call onChildPipelineDone after child pipeline completes', async () => {
      const childPipeline: Pipeline = { tasks: [{ type: 'agent', task: 'child work' }] }
      const loadChildPipeline = vi.fn().mockReturnValue(childPipeline)
      const onChildPipelineDone = vi.fn()
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())

      const pipeline: Pipeline = { tasks: [{ type: 'child', path: '/absolute/sub.json' }] }
      const events: PipelineTaskResult[] = []
      for await (const e of service.run(pipeline, {
        loadChildPipeline,
        pipelineDir: '/absolute',
        onChildPipelineDone
      }))
        events.push(e)

      expect(onChildPipelineDone).toHaveBeenCalledWith('/absolute/sub.json')
    })

    it('should use process.cwd() as base when pipelineDir is not specified', async () => {
      const childPipeline: Pipeline = { tasks: [] }
      const loadChildPipeline = vi.fn().mockReturnValue(childPipeline)

      const pipeline: Pipeline = { tasks: [{ type: 'child', path: '/absolute/sub.json' }] }
      const events: PipelineTaskResult[] = []
      for await (const e of service.run(pipeline, { loadChildPipeline })) events.push(e)

      expect(loadChildPipeline).toHaveBeenCalledWith('/absolute/sub.json')
    })
  })
})

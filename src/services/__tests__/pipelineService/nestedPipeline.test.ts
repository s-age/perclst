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

  function collectEvents(
    pipeline: Pipeline,
    options?: Parameters<typeof service.run>[1]
  ): Promise<PipelineTaskResult[]> {
    const events: PipelineTaskResult[] = []
    return (async (): Promise<PipelineTaskResult[]> => {
      for await (const event of service.run(pipeline, options)) events.push(event)
      return events
    })()
  }

  describe('nested pipeline tasks', () => {
    it('should emit task_start with correct taskPath for nested tasks', async () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'pipeline', name: 'sub', tasks: [{ type: 'agent', task: 'work', name: 'child' }] }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(2)
      expect(starts[0]).toMatchObject({ taskPath: [], taskIndex: 0, taskType: 'pipeline' })
      expect(starts[1]).toMatchObject({ taskPath: [0], taskIndex: 0, taskType: 'agent' })
    })

    it('should emit pipeline_end after all nested tasks complete', async () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'pipeline', name: 'sub', tasks: [{ type: 'agent', task: 'work' }] }]
      }
      const events = await collectEvents(pipeline)
      const pipelineEnd = events.find((e) => e.kind === 'pipeline_end')
      expect(pipelineEnd).toEqual({ kind: 'pipeline_end', taskPath: [], taskIndex: 0 })
      expect(events.indexOf(events.find((e) => e.kind === 'agent')!)).toBeLessThan(
        events.indexOf(pipelineEnd!)
      )
    })

    it('should emit events for multiple levels of nesting with correct paths', async () => {
      const pipeline: Pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'outer',
            tasks: [{ type: 'pipeline', name: 'inner', tasks: [{ type: 'agent', task: 'work' }] }]
          }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts[0]).toMatchObject({ taskPath: [], taskIndex: 0, taskType: 'pipeline' })
      expect(starts[1]).toMatchObject({ taskPath: [0], taskIndex: 0, taskType: 'pipeline' })
      expect(starts[2]).toMatchObject({ taskPath: [0, 0], taskIndex: 0, taskType: 'agent' })
      const ends = events.filter((e) => e.kind === 'pipeline_end')
      expect(ends[0]).toEqual({ kind: 'pipeline_end', taskPath: [0], taskIndex: 0 })
      expect(ends[1]).toEqual({ kind: 'pipeline_end', taskPath: [], taskIndex: 0 })
    })
  })
})

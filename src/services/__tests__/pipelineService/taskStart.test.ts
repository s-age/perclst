import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline } from '@src/types/pipeline'
import type { IPipelineDomain, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import type { IPipelineTaskDomain } from '@src/domains/ports/pipelineTask'
import type { IPipelineLoaderDomain } from '@src/domains/ports/pipelineLoader'
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
    run: vi.fn<(command: string, cwd: string) => Promise<ScriptResult>>()
  }
  const mockPipelineTaskDomain: IPipelineTaskDomain = { markTaskDone: vi.fn() }
  const mockLoaderDomain: IPipelineLoaderDomain = { load: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockPipelineDomain.getWorkingDirectory).mockReturnValue('/test/cwd')
    vi.mocked(mockPipelineDomain.runAgentTask).mockImplementation(async (_task, taskLocation) =>
      stubAgentResult({ taskIndex: taskLocation.index, taskPath: taskLocation.taskPath })
    )
    service = new PipelineService(
      mockPipelineDomain,
      mockScriptDomain,
      mockPipelineTaskDomain,
      mockLoaderDomain
    )
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

  describe('task_start events', () => {
    it('should emit task_start event for agent task', async () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', task: 'do something', name: 'test-agent' }]
      }
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(
        stubAgentResult({ taskIndex: 0, name: 'test-agent' })
      )
      const events = await collectEvents(pipeline)
      expect(events.find((e) => e.kind === 'task_start')).toEqual({
        kind: 'task_start',
        taskPath: [],
        taskIndex: 0,
        name: 'test-agent',
        taskType: 'agent'
      })
    })

    it('should emit task_start event for script task', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({ exitCode: 0, stdout: 'test', stderr: '' })
      const events = await collectEvents({ tasks: [{ type: 'script', command: 'echo "test"' }] })
      expect(events.find((e) => e.kind === 'task_start')).toEqual({
        kind: 'task_start',
        taskPath: [],
        taskIndex: 0,
        name: undefined,
        taskType: 'script'
      })
    })

    it('should emit task_start before task result event', async () => {
      const events = await collectEvents({ tasks: [{ type: 'agent', task: 'do something' }] })
      const startIdx = events.findIndex((e) => e.kind === 'task_start')
      const agentIdx = events.findIndex((e) => e.kind === 'agent')
      expect(startIdx).toBeLessThan(agentIdx)
    })

    it('should emit task_start for each task in sequence', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'agent work' },
          { type: 'script', command: 'echo test' }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(2)
      expect(starts[0]).toMatchObject({ taskIndex: 0, taskPath: [] })
      expect(starts[1]).toMatchObject({ taskIndex: 1, taskPath: [] })
    })
  })
})

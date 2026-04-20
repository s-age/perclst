import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline, AgentPipelineTask } from '@src/types/pipeline'
import type { IPipelineDomain, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import type { AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import { PipelineService, type PipelineTaskResult } from '../pipelineService'

vi.mock('fs')
vi.mock('@src/utils/output', () => ({
  debug: { print: vi.fn() }
}))

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
    runWithLimit: vi.fn<
      [Session, string, boolean, object, number, number],
      Promise<AgentResponse>
    >(),
    buildRejectedInstruction: vi.fn<[AgentPipelineTask, object], string>(),
    getRejectionFeedback: vi.fn<[string], Promise<string | undefined>>(),
    getWorkingDirectory: vi.fn<[], string>(),
    resolveRejection: vi.fn(),
    buildExecuteOptions: vi.fn(),
    runAgentTask: vi.fn<
      [AgentPipelineTask, number, number[], object, object?],
      Promise<AgentTaskResult>
    >(),
    findOuterRejectionTarget: vi.fn<[object], number | undefined>(),
    resolveScriptRejection: vi.fn()
  }
  const mockScriptDomain: IScriptDomain = {
    run: vi.fn<[string, string], Promise<ScriptResult>>()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockPipelineDomain.getWorkingDirectory).mockReturnValue('/test/cwd')
    vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())
    service = new PipelineService(mockPipelineDomain, mockScriptDomain)
  })

  async function collectEvents(pipeline: Pipeline): Promise<PipelineTaskResult[]> {
    const events: PipelineTaskResult[] = []
    for await (const event of service.run(pipeline)) events.push(event)
    return events
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

  describe('retry events', () => {
    const stubRejectionResult = (targetIndex: number, newCount = 1) =>
      ({
        targetIndex,
        newCount,
        context: {
          retry_count: newCount,
          task: { type: 'agent', task: '' } as AgentPipelineTask,
          feedback: ''
        }
      }) as const

    it('should emit retry event when agent rejection triggers', async () => {
      let callCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () =>
        ++callCount === 1 ? 'feedback' : undefined
      )
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))
      vi.mocked(mockPipelineDomain.runAgentTask)
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 0, name: 'target-agent' }))
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 1, name: 'rejection-agent' }))
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 0, name: 'target-agent' }))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'initial', name: 'target-agent' },
          {
            type: 'agent',
            task: 'reject',
            name: 'rejection-agent',
            rejected: { to: 'target-agent', max_retries: 2 }
          }
        ]
      }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent).toBeDefined()
      expect(retryEvent?.taskIndex).toBe(1)
      expect(retryEvent?.name).toBe('rejection-agent')
      expect(retryEvent?.retryCount).toBe(1)
      expect(retryEvent?.maxRetries).toBe(2)
    })

    it('should emit retry event when script rejection triggers', async () => {
      vi.mocked(mockPipelineDomain.resolveScriptRejection)
        .mockReturnValueOnce(stubRejectionResult(0))
        .mockReturnValue(undefined)
      let scriptRunCount = 0
      vi.mocked(mockScriptDomain.run).mockImplementation(async () => ({
        exitCode: ++scriptRunCount === 1 ? 1 : 0,
        stdout: 'out',
        stderr: 'err'
      }))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target-agent' },
          {
            type: 'script',
            command: 'failing-script',
            rejected: { to: 'target-agent', max_retries: 2 }
          }
        ]
      }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent?.taskIndex).toBe(1)
      expect(retryEvent?.retryCount).toBe(1)
      expect(retryEvent?.maxRetries).toBe(2)
    })

    it('should use default max_retries of 1 when not specified', async () => {
      let callCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () =>
        ++callCount === 1 ? 'feedback' : undefined
      )
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'agent', task: 'reject', name: 'reject', rejected: { to: 'target' } }
        ]
      }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      expect(events.find((e) => e.kind === 'retry')?.maxRetries).toBe(1)
    })

    it('should emit retry event with correct taskIndex', async () => {
      let callCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () =>
        ++callCount === 1 ? 'feedback' : undefined
      )
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target-1' },
          { type: 'agent', task: 'middle', name: 'middle' },
          {
            type: 'agent',
            task: 'reject',
            name: 'reject-task',
            rejected: { to: 'target-1', max_retries: 2 }
          }
        ]
      }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent?.taskIndex).toBe(2)
      expect(retryEvent?.name).toBe('reject-task')
      expect(retryEvent?.retryCount).toBe(1)
      expect(retryEvent?.maxRetries).toBe(2)
    })
  })
})

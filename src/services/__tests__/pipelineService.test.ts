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
    vi.mocked(mockPipelineDomain.runAgentTask).mockImplementation(
      async (task, taskIndex, taskPath) => {
        return stubAgentResult({ taskIndex, taskPath })
      }
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

  describe('task skipping with done flag', () => {
    it('should skip tasks marked as done', async () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'first', name: 'first', done: true },
          { type: 'agent', task: 'second', name: 'second' }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(1)
      expect(starts[0]).toMatchObject({ taskIndex: 1, name: 'second' })
    })

    it('should skip multiple done tasks', async () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'first', name: 'first', done: true },
          { type: 'agent', task: 'second', name: 'second', done: true },
          { type: 'agent', task: 'third', name: 'third' }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(1)
      expect(starts[0]).toMatchObject({ taskIndex: 2, name: 'third' })
    })
  })

  describe('onTaskDone callback', () => {
    it('should invoke onTaskDone when task completes without retry', async () => {
      const onTaskDone = vi.fn()
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', task: 'work', name: 'test' }]
      }
      await collectEvents(pipeline, { onTaskDone })
      expect(onTaskDone).toHaveBeenCalledWith([], 0)
    })

    it('should not invoke onTaskDone when task is retried', async () => {
      const onTaskDone = vi.fn()
      let callCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () =>
        ++callCount === 1 ? 'feedback' : undefined
      )
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue({
        targetIndex: 0,
        newCount: 1,
        context: {
          retry_count: 1,
          task: { type: 'agent', task: '' } as AgentPipelineTask,
          feedback: ''
        }
      })
      vi.mocked(mockPipelineDomain.runAgentTask).mockImplementation(
        async (task, taskIndex, taskPath) =>
          stubAgentResult({ taskIndex, taskPath, name: taskIndex === 0 ? 'target' : 'rejector' })
      )

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'agent', task: 'reject', name: 'rejector', rejected: { to: 'target' } }
        ]
      }
      await collectEvents(pipeline, { onTaskDone })
      // onTaskDone is called: task 0 (first), task 0 (retry), task 1 (after retry)
      expect(onTaskDone).toHaveBeenCalledTimes(3)
      expect(onTaskDone).toHaveBeenNthCalledWith(1, [], 0)
      expect(onTaskDone).toHaveBeenNthCalledWith(2, [], 0)
      expect(onTaskDone).toHaveBeenNthCalledWith(3, [], 1)
    })

    it('should invoke onTaskDone with nested taskPath', async () => {
      const onTaskDone = vi.fn()
      const pipeline: Pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'nested',
            tasks: [{ type: 'agent', task: 'work', name: 'nested-task' }]
          }
        ]
      }
      await collectEvents(pipeline, { onTaskDone })
      expect(onTaskDone).toHaveBeenCalledWith([0], 0)
      expect(onTaskDone).toHaveBeenCalledWith([], 0)
    })
  })

  describe('error handling', () => {
    it('should throw when runAgentTask fails', async () => {
      vi.mocked(mockPipelineDomain.runAgentTask).mockRejectedValue(
        new Error('Agent execution failed')
      )
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', task: 'failing', name: 'fail' }]
      }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline)) events.push(e)
      }).rejects.toThrow('Agent execution failed')
    })

    it('should throw when scriptDomain.run fails', async () => {
      vi.mocked(mockScriptDomain.run).mockRejectedValue(new Error('Script failed'))
      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'failing-command' }]
      }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline)) events.push(e)
      }).rejects.toThrow('Script failed')
    })

    it('should throw when child pipeline loader fails', async () => {
      const loadChildPipeline = vi.fn().mockImplementation(() => {
        throw new Error('Failed to load child pipeline')
      })
      const pipeline: Pipeline = {
        tasks: [{ type: 'child', path: 'sub.json' }]
      }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline, { loadChildPipeline })) events.push(e)
      }).rejects.toThrow('Failed to load child pipeline')
    })
  })

  describe('agent rejection without feedback', () => {
    it('should not trigger retry when no feedback provided', async () => {
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockResolvedValue(undefined)
      vi.mocked(mockPipelineDomain.runAgentTask)
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 0, name: 'target' }))
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 1, name: 'rejector' }))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'agent', task: 'reject', name: 'rejector', rejected: { to: 'target' } }
        ]
      }
      const events = await collectEvents(pipeline)
      const retryEvents = events.filter((e) => e.kind === 'retry')
      expect(retryEvents).toHaveLength(0)
    })
  })

  describe('agent rejection without name', () => {
    it('should not trigger retry when task has no name', async () => {
      vi.mocked(mockPipelineDomain.runAgentTask)
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 0, name: 'target' }))
        .mockResolvedValueOnce(stubAgentResult({ taskIndex: 1, name: undefined }))

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'agent', task: 'reject', rejected: { to: 'target' } }
        ]
      }
      const events = await collectEvents(pipeline)
      const retryEvents = events.filter((e) => e.kind === 'retry')
      expect(retryEvents).toHaveLength(0)
    })
  })

  describe('script rejection handling', () => {
    it('should not emit retry when resolveScriptRejection returns undefined', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 1,
        stdout: 'out',
        stderr: 'err'
      })
      vi.mocked(mockPipelineDomain.resolveScriptRejection).mockReturnValue(undefined)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'script', command: 'failing-cmd', rejected: { to: 'target', max_retries: 2 } }
        ]
      }
      const events = await collectEvents(pipeline)
      const retryEvents = events.filter((e) => e.kind === 'retry')
      expect(retryEvents).toHaveLength(0)
    })

    it('should track retry count for script rejections', async () => {
      let scriptRunCount = 0
      vi.mocked(mockScriptDomain.run).mockImplementation(async () => ({
        exitCode: ++scriptRunCount > 0 ? 1 : 0,
        stdout: 'out',
        stderr: 'err'
      }))
      vi.mocked(mockPipelineDomain.resolveScriptRejection)
        .mockReturnValueOnce({
          targetIndex: 0,
          newCount: 1,
          context: {
            retry_count: 1,
            task: { type: 'script', command: '' } as ScriptPipelineTask,
            feedback: ''
          }
        })
        .mockReturnValue(undefined)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(stubAgentResult())

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'script', command: 'cmd', rejected: { to: 'target', max_retries: 2 } }
        ]
      }
      const events = await collectEvents(pipeline)
      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent).toBeDefined()
      expect(retryEvent?.retryCount).toBe(1)
    })
  })

  describe('empty pipeline', () => {
    it('should handle empty task list', async () => {
      const pipeline: Pipeline = { tasks: [] }
      const events = await collectEvents(pipeline)
      expect(events).toHaveLength(0)
    })
  })

  describe('single task pipeline', () => {
    it('should handle single agent task', async () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', task: 'single', name: 'only' }]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(1)
      const agents = events.filter((e) => e.kind === 'agent')
      expect(agents).toHaveLength(1)
    })

    it('should handle single script task', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'output',
        stderr: ''
      })
      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'echo test' }]
      }
      const events = await collectEvents(pipeline)
      const scripts = events.filter((e) => e.kind === 'script')
      expect(scripts).toHaveLength(1)
      expect(scripts[0]).toMatchObject({
        command: 'echo test',
        result: { exitCode: 0, stdout: 'output', stderr: '' }
      })
    })
  })

  describe('mixed task types', () => {
    it('should execute agent, script, and pipeline tasks in sequence', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'output',
        stderr: ''
      })

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'agent-work', name: 'agent-1' },
          { type: 'script', command: 'echo test' },
          { type: 'pipeline', name: 'nested', tasks: [{ type: 'agent', task: 'nested-work' }] }
        ]
      }
      const events = await collectEvents(pipeline)
      const starts = events.filter((e) => e.kind === 'task_start')
      expect(starts).toHaveLength(4)
      expect(starts[0]).toMatchObject({ taskType: 'agent', taskIndex: 0 })
      expect(starts[1]).toMatchObject({ taskType: 'script', taskIndex: 1 })
      expect(starts[2]).toMatchObject({ taskType: 'pipeline', taskIndex: 2 })
      expect(starts[3]).toMatchObject({ taskType: 'agent', taskPath: [2] })
    })
  })

  describe('agent step execution', () => {
    it('should yield agent result with correct taskPath and taskIndex', async () => {
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(
        stubAgentResult({ taskIndex: 0, name: 'test', sessionId: 'session-123' })
      )

      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', task: 'work', name: 'test' }]
      }
      const events = await collectEvents(pipeline)
      const agentEvent = events.find((e) => e.kind === 'agent')
      expect(agentEvent).toMatchObject({
        kind: 'agent',
        taskPath: [],
        taskIndex: 0,
        name: 'test',
        sessionId: 'session-123'
      })
    })

    it('should yield agent result from nested task with correct taskPath', async () => {
      const pipeline: Pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'nested',
            tasks: [{ type: 'agent', task: 'work', name: 'nested-agent' }]
          }
        ]
      }
      const events = await collectEvents(pipeline)
      const agentEvent = events.find((e) => e.kind === 'agent')
      expect(agentEvent).toMatchObject({ taskPath: [0], taskIndex: 0 })
    })
  })

  describe('script step execution', () => {
    it('should yield script result with correct command', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'test output',
        stderr: 'test error'
      })

      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'test-command arg1 arg2' }]
      }
      const events = await collectEvents(pipeline)
      const scriptEvent = events.find((e) => e.kind === 'script')
      expect(scriptEvent).toMatchObject({
        kind: 'script',
        taskPath: [],
        taskIndex: 0,
        command: 'test-command arg1 arg2',
        result: { exitCode: 0, stdout: 'test output', stderr: 'test error' }
      })
    })

    it('should handle script with non-zero exit code', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 127,
        stdout: '',
        stderr: 'command not found'
      })

      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'missing-command' }]
      }
      const events = await collectEvents(pipeline)
      const scriptEvent = events.find((e) => e.kind === 'script')
      expect(scriptEvent?.result.exitCode).toBe(127)
    })
  })
})

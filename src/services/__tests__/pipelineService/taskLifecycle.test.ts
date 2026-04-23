import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline, AgentPipelineTask } from '@src/types/pipeline'
import type { IPipelineDomain, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import type { AgentResponse } from '@src/types/agent'
import { PipelineService, type PipelineTaskResult } from '../../pipelineService'
import { PipelineAbortedError } from '@src/errors/pipelineAbortedError'

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
      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work', name: 'test' }] }
      await collectEvents(pipeline, { onTaskDone })
      expect(onTaskDone).toHaveBeenCalledWith([], 0)
    })

    it('should invoke onTaskDone for each task completion including retries', async () => {
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
      vi.mocked(mockPipelineDomain.runAgentTask).mockImplementation(async (_task, taskLocation) =>
        stubAgentResult({
          taskIndex: taskLocation.index,
          taskPath: taskLocation.taskPath,
          name: taskLocation.index === 0 ? 'target' : 'rejector'
        })
      )

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'agent', task: 'reject', name: 'rejector', rejected: { to: 'target' } }
        ]
      }
      await collectEvents(pipeline, { onTaskDone })
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

  describe('empty pipeline', () => {
    it('should handle empty task list', async () => {
      const events = await collectEvents({ tasks: [] })
      expect(events).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('should throw when runAgentTask fails', async () => {
      vi.mocked(mockPipelineDomain.runAgentTask).mockRejectedValue(
        new Error('Agent execution failed')
      )
      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'failing', name: 'fail' }] }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline)) events.push(e)
      }).rejects.toThrow('Agent execution failed')
    })

    it('should throw when scriptDomain.run fails', async () => {
      vi.mocked(mockScriptDomain.run).mockRejectedValue(new Error('Script failed'))
      const pipeline: Pipeline = { tasks: [{ type: 'script', command: 'failing-command' }] }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline)) events.push(e)
      }).rejects.toThrow('Script failed')
    })

    it('should throw when child pipeline loader fails', async () => {
      const loadChildPipeline = vi.fn().mockImplementation(() => {
        throw new Error('Failed to load child pipeline')
      })
      const pipeline: Pipeline = { tasks: [{ type: 'child', path: 'sub.json' }] }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline, { loadChildPipeline })) events.push(e)
      }).rejects.toThrow('Failed to load child pipeline')
    })
  })

  describe('abort signal handling', () => {
    it('should throw PipelineAbortedError when signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work' }] }
      await expect(async () => {
        const events: PipelineTaskResult[] = []
        for await (const e of service.run(pipeline, { signal: controller.signal })) events.push(e)
      }).rejects.toThrow(PipelineAbortedError)
    })
  })
})

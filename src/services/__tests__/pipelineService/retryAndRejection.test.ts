import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline, AgentPipelineTask, RejectedContext } from '@src/types/pipeline'
import type { IPipelineDomain, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { IScriptDomain } from '@src/domains/ports/script'
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
    run: vi.fn()
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

  describe('retry events', () => {
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
      expect(events.filter((e) => e.kind === 'retry')).toHaveLength(0)
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
      expect(events.filter((e) => e.kind === 'retry')).toHaveLength(0)
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
      expect(events.filter((e) => e.kind === 'retry')).toHaveLength(0)
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
            task: { type: 'agent', task: '' } as AgentPipelineTask,
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

    it('should clear done flag on retry target so it re-runs with rejection context', async () => {
      const rejectionContext: RejectedContext = {
        retry_count: 1,
        task: { type: 'agent', task: 'target' } as AgentPipelineTask,
        feedback: 'script failed'
      }
      vi.mocked(mockScriptDomain.run).mockImplementation(async () => ({
        exitCode: 1,
        stdout: 'out',
        stderr: 'err'
      }))
      vi.mocked(mockPipelineDomain.resolveScriptRejection)
        .mockReturnValueOnce({
          targetIndex: 0,
          newCount: 1,
          context: rejectionContext
        })
        .mockReturnValue(undefined)

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'target', name: 'target' },
          { type: 'script', command: 'check', rejected: { to: 'target', max_retries: 2 } }
        ]
      }
      const onTaskDone = vi.fn((_taskPath: number[], taskIndex: number) => {
        pipeline.tasks[taskIndex].done = true
      })

      await collectEvents(pipeline, { onTaskDone })

      const agentCalls = vi.mocked(mockPipelineDomain.runAgentTask).mock.calls
      expect(agentCalls).toHaveLength(2)
      expect(agentCalls[1][3]).toEqual(rejectionContext)
    })

    it('should mark all tasks done after successful retry with onTaskDone', async () => {
      vi.mocked(mockScriptDomain.run)
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'error', stderr: '' })
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'ok', stderr: '' })
      vi.mocked(mockPipelineDomain.resolveScriptRejection)
        .mockReturnValueOnce(stubRejectionResult(0))
        .mockReturnValue(undefined)

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'fix code', name: 'fixer' },
          { type: 'script', command: 'check', rejected: { to: 'fixer', max_retries: 2 } }
        ]
      }
      const onTaskDone = vi.fn((_taskPath: number[], taskIndex: number) => {
        pipeline.tasks[taskIndex].done = true
      })

      await collectEvents(pipeline, { onTaskDone })

      expect(pipeline.tasks[0].done).toBe(true)
      expect(pipeline.tasks[1].done).toBe(true)
    })

    it('should not affect done flags when script has no rejection config', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 1,
        stdout: 'fail',
        stderr: ''
      })
      vi.mocked(mockPipelineDomain.resolveScriptRejection).mockReturnValue(undefined)

      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'work', name: 'worker' },
          { type: 'script', command: 'check' }
        ]
      }
      const onTaskDone = vi.fn((_taskPath: number[], taskIndex: number) => {
        pipeline.tasks[taskIndex].done = true
      })

      await collectEvents(pipeline, { onTaskDone })

      expect(pipeline.tasks[0].done).toBe(true)
      expect(pipeline.tasks[1].done).toBe(true)
    })
  })

  describe('outerRejection parameter', () => {
    const mockRejection: RejectedContext = {
      retry_count: 1,
      task: { type: 'agent', task: 'rejected work' } as AgentPipelineTask,
      feedback: 'needs improvement'
    }

    it('should pass rejection to agent task when findOuterRejectionTarget returns a valid index', async () => {
      vi.mocked(mockPipelineDomain.findOuterRejectionTarget).mockReturnValue(0)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(
        stubAgentResult({ taskIndex: 0 })
      )

      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work', name: 'target' }] }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline, {}, mockRejection)) events.push(event)

      expect(mockPipelineDomain.findOuterRejectionTarget).toHaveBeenCalledWith(pipeline)
      expect(mockPipelineDomain.runAgentTask).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        mockRejection
      )
    })

    it('should not set pending rejection when findOuterRejectionTarget returns undefined', async () => {
      vi.mocked(mockPipelineDomain.findOuterRejectionTarget).mockReturnValue(undefined)
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(
        stubAgentResult({ taskIndex: 0 })
      )

      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work', name: 'target' }] }
      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline, {}, mockRejection)) events.push(event)

      expect(mockPipelineDomain.findOuterRejectionTarget).toHaveBeenCalledWith(pipeline)
      expect(mockPipelineDomain.runAgentTask).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined
      )
    })
  })
})

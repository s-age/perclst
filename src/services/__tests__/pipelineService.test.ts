import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Pipeline, AgentPipelineTask, ScriptPipelineTask } from '@src/types/pipeline'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IPipelineDomain } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import type { AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import { PipelineService, type PipelineTaskResult } from '../pipelineService'

vi.mock('fs')
vi.mock('@src/utils/output', () => ({
  debug: { print: vi.fn() }
}))

describe('PipelineService', () => {
  let service: PipelineService
  const mockSessionDomain: ISessionDomain = {
    create: vi.fn<[], Promise<Session>>(),
    findByName: vi.fn<[string], Promise<Session | null>>(),
    getPath: vi.fn<[string], string>(),
    updateStatus: vi.fn<[string, string], Promise<void>>()
  }
  const mockPipelineDomain: IPipelineDomain = {
    runWithLimit: vi.fn<
      [Session, string, boolean, object, number, number],
      Promise<AgentResponse>
    >(),
    buildRejectedInstruction: vi.fn<[AgentPipelineTask, object], string>(),
    getRejectionFeedback: vi.fn<[string], Promise<string | undefined>>(),
    getWorkingDirectory: vi.fn<[], string>(),
    resolveRejection: vi.fn()
  }
  const mockScriptDomain: IScriptDomain = {
    run: vi.fn<[string, string], Promise<ScriptResult>>()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockPipelineDomain.getWorkingDirectory).mockReturnValue('/test/cwd')
    service = new PipelineService(mockSessionDomain, mockPipelineDomain, mockScriptDomain)
  })

  describe('task_start events', () => {
    it('should emit task_start event for agent task', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'test-agent'
      }
      const pipeline: Pipeline = { tasks: [task] }

      const mockSession: Session = { id: 'session-1', name: 'test-agent' } as Session
      vi.mocked(mockSessionDomain.create).mockResolvedValue(mockSession)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) {
        events.push(event)
      }

      const taskStartEvent = events.find((e) => e.kind === 'task_start')
      expect(taskStartEvent).toEqual({
        kind: 'task_start',
        taskIndex: 0,
        name: 'test-agent',
        taskType: 'agent'
      })
    })

    it('should emit task_start event for script task', async () => {
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'echo "test"'
      }
      const pipeline: Pipeline = { tasks: [task] }

      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'test',
        stderr: ''
      })

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) {
        events.push(event)
      }

      const taskStartEvent = events.find((e) => e.kind === 'task_start')
      expect(taskStartEvent).toEqual({
        kind: 'task_start',
        taskIndex: 0,
        name: undefined,
        taskType: 'script'
      })
    })

    it('should emit task_start event before task result event', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something'
      }
      const pipeline: Pipeline = { tasks: [task] }

      const mockSession: Session = { id: 'session-1' } as Session
      vi.mocked(mockSessionDomain.create).mockResolvedValue(mockSession)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) {
        events.push(event)
      }

      const taskStartIndex = events.findIndex((e) => e.kind === 'task_start')
      const agentResultIndex = events.findIndex((e) => e.kind === 'agent')
      expect(taskStartIndex).toBeLessThan(agentResultIndex)
    })

    it('should emit task_start for each task in sequence', async () => {
      const agentTask: AgentPipelineTask = {
        type: 'agent',
        task: 'agent work'
      }
      const scriptTask: ScriptPipelineTask = {
        type: 'script',
        command: 'echo test'
      }
      const pipeline: Pipeline = { tasks: [agentTask, scriptTask] }

      const mockSession: Session = { id: 'session-1' } as Session
      vi.mocked(mockSessionDomain.create).mockResolvedValue(mockSession)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) {
        events.push(event)
      }

      const taskStartEvents = events.filter((e) => e.kind === 'task_start')
      expect(taskStartEvents).toHaveLength(2)
      expect(taskStartEvents[0]?.taskIndex).toBe(0)
      expect(taskStartEvents[1]?.taskIndex).toBe(1)
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

    it('should emit retry event with correct structure when agent rejection triggers', async () => {
      let feedbackCallCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () => {
        feedbackCallCount++
        return feedbackCallCount === 1 ? 'feedback from agent' : undefined
      })
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const targetTask: AgentPipelineTask = {
        type: 'agent',
        task: 'initial task',
        name: 'target-agent'
      }
      const rejectionTask: AgentPipelineTask = {
        type: 'agent',
        task: 'rejection task',
        name: 'rejection-agent',
        rejected: { to: 'target-agent', max_retries: 2 }
      }
      const pipeline: Pipeline = { tasks: [targetTask, rejectionTask] }

      vi.mocked(mockSessionDomain.create).mockResolvedValue({ id: 'session-1' } as Session)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

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
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const targetTask: AgentPipelineTask = {
        type: 'agent',
        task: 'target task',
        name: 'target-agent'
      }
      const scriptTask: ScriptPipelineTask = {
        type: 'script',
        command: 'failing-script',
        rejected: { to: 'target-agent', max_retries: 2 }
      }
      const pipeline: Pipeline = { tasks: [targetTask, scriptTask] }

      vi.mocked(mockSessionDomain.create).mockResolvedValue({ id: 'session-1' } as Session)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

      let scriptRunCount = 0
      vi.mocked(mockScriptDomain.run).mockImplementation(async () => {
        scriptRunCount++
        return { exitCode: scriptRunCount === 1 ? 1 : 0, stdout: 'out', stderr: 'err' }
      })

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent?.taskIndex).toBe(1)
      expect(retryEvent?.retryCount).toBe(1)
      expect(retryEvent?.maxRetries).toBe(2)
    })

    it('should use default max_retries of 1 when not specified in agent rejection', async () => {
      let feedbackCallCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () => {
        feedbackCallCount++
        return feedbackCallCount === 1 ? 'feedback' : undefined
      })
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const targetTask: AgentPipelineTask = { type: 'agent', task: 'target', name: 'target' }
      const rejectTask: AgentPipelineTask = {
        type: 'agent',
        task: 'reject',
        name: 'reject',
        rejected: { to: 'target' }
      }
      const pipeline: Pipeline = { tasks: [targetTask, rejectTask] }

      vi.mocked(mockSessionDomain.create).mockResolvedValue({ id: 'session-1' } as Session)
      vi.mocked(mockSessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

      const events: PipelineTaskResult[] = []
      for await (const event of service.run(pipeline)) events.push(event)

      const retryEvent = events.find((e) => e.kind === 'retry')
      expect(retryEvent?.maxRetries).toBe(1)
    })

    it('should emit retry event with correct taskIndex and retryCount', async () => {
      let feedbackCallCount = 0
      vi.mocked(mockPipelineDomain.getRejectionFeedback).mockImplementation(async () => {
        feedbackCallCount++
        return feedbackCallCount === 1 ? 'feedback' : undefined
      })
      vi.mocked(mockPipelineDomain.resolveRejection).mockReturnValue(stubRejectionResult(0))

      const targetTask: AgentPipelineTask = { type: 'agent', task: 'target', name: 'target-1' }
      const middleTask: AgentPipelineTask = { type: 'agent', task: 'middle', name: 'middle' }
      const rejectTask: AgentPipelineTask = {
        type: 'agent',
        task: 'reject',
        name: 'reject-task',
        rejected: { to: 'target-1', max_retries: 2 }
      }
      const pipeline: Pipeline = { tasks: [targetTask, middleTask, rejectTask] }

      vi.mocked(mockSessionDomain.create).mockResolvedValue({ id: 'session-1' } as Session)
      vi.mocked(mockSessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(mockPipelineDomain.runWithLimit).mockResolvedValue({} as AgentResponse)
      vi.mocked(mockSessionDomain.getPath).mockReturnValue('/path')

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

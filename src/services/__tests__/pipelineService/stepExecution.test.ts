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

  describe('agent step execution', () => {
    it('should yield agent result with correct taskPath and taskIndex', async () => {
      vi.mocked(mockPipelineDomain.runAgentTask).mockResolvedValue(
        stubAgentResult({ taskIndex: 0, name: 'test', sessionId: 'session-123' })
      )
      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'work', name: 'test' }] }
      const events = await collectEvents(pipeline)
      expect(events.find((e) => e.kind === 'agent')).toMatchObject({
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
      expect(events.find((e) => e.kind === 'agent')).toMatchObject({ taskPath: [0], taskIndex: 0 })
    })
  })

  describe('script step execution', () => {
    it('should yield script result with correct command', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'test output',
        stderr: 'test error'
      })
      const pipeline: Pipeline = { tasks: [{ type: 'script', command: 'test-command arg1 arg2' }] }
      const events = await collectEvents(pipeline)
      expect(events.find((e) => e.kind === 'script')).toMatchObject({
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
      const pipeline: Pipeline = { tasks: [{ type: 'script', command: 'missing-command' }] }
      const events = await collectEvents(pipeline)
      expect(events.find((e) => e.kind === 'script')?.result.exitCode).toBe(127)
    })
  })

  describe('single task pipeline', () => {
    it('should handle single agent task', async () => {
      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'single', name: 'only' }] }
      const events = await collectEvents(pipeline)
      expect(events.filter((e) => e.kind === 'task_start')).toHaveLength(1)
      expect(events.filter((e) => e.kind === 'agent')).toHaveLength(1)
    })

    it('should handle single script task', async () => {
      vi.mocked(mockScriptDomain.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'output',
        stderr: ''
      })
      const pipeline: Pipeline = { tasks: [{ type: 'script', command: 'echo test' }] }
      const events = await collectEvents(pipeline)
      expect(events.find((e) => e.kind === 'script')).toMatchObject({
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
})

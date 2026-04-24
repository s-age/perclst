import { vi, describe, it, expect, beforeEach } from 'vitest'
import type {
  AgentPipelineTask,
  NestedPipelineTask,
  Pipeline,
  ScriptPipelineTask
} from '@src/types/pipeline'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { ScriptResult } from '@src/domains/ports/script'
import { debug } from '@src/utils/output'
import { PipelineDomain } from '../../pipeline'

// Mock module-level dependencies
vi.mock('@src/errors/pipelineMaxRetriesError', () => ({
  PipelineMaxRetriesError: class PipelineMaxRetriesError extends Error {
    constructor(taskIndex: number, maxRetries: number) {
      super(`Max retries exceeded at task ${taskIndex}: ${maxRetries}`)
    }
  }
}))

vi.mock('@src/utils/output', () => ({
  debug: {
    print: vi.fn()
  }
}))

describe('PipelineDomain - rejection handling', () => {
  let pipelineDomain: PipelineDomain
  let agentDomain: IAgentDomain
  let sessionDomain: ISessionDomain
  let rejectionFeedbackRepo: IRejectionFeedbackRepository

  beforeEach(() => {
    vi.clearAllMocks()

    agentDomain = {
      run: vi.fn()
    } as unknown as IAgentDomain

    sessionDomain = {
      create: vi.fn(),
      findByName: vi.fn(),
      getPath: vi.fn(),
      updateStatus: vi.fn()
    } as unknown as ISessionDomain

    rejectionFeedbackRepo = {
      getFeedback: vi.fn(),
      getCwd: vi.fn()
    } as unknown as IRejectionFeedbackRepository

    pipelineDomain = new PipelineDomain(agentDomain, sessionDomain, rejectionFeedbackRepo)
  })

  describe('resolveRejection', () => {
    it('increments retry count and finds target task by name', () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', name: 'first', task: 'task 1' },
          { type: 'agent', name: 'retry_target', task: 'task 2' }
        ]
      }

      const result = pipelineDomain.resolveRejection(
        pipeline,
        { toName: 'retry_target', feedback: 'feedback' },
        { taskIndex: 0, currentCount: 1, maxRetries: 3 }
      )

      expect(result.newCount).toBe(2)
      expect(result.targetIndex).toBe(1)
      expect(result.context.retry_count).toBe(2)
      expect(result.context.feedback).toBe('feedback')
    })

    it('finds agent task within nested pipeline by name', () => {
      const agentTask: AgentPipelineTask = {
        type: 'agent',
        name: 'nested_agent',
        task: 'nested task'
      }
      const pipeline: Pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'nested',
            tasks: [agentTask]
          } as unknown as NestedPipelineTask
        ]
      }

      const result = pipelineDomain.resolveRejection(
        pipeline,
        { toName: 'nested', feedback: 'feedback' },
        { taskIndex: 0, currentCount: 0, maxRetries: 2 }
      )

      expect(result.targetIndex).toBe(0)
      expect(result.context.task).toEqual(agentTask)
    })

    it('throws error when target not found', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'first', task: 'task 1' }]
      }

      expect(() => {
        pipelineDomain.resolveRejection(
          pipeline,
          { toName: 'nonexistent', feedback: 'feedback' },
          { taskIndex: 0, currentCount: 0, maxRetries: 2 }
        )
      }).toThrow("Rejection target 'nonexistent' not found in pipeline")
    })

    it('throws PipelineMaxRetriesError when exceeding max retries', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'task' }]
      }

      expect(() => {
        pipelineDomain.resolveRejection(
          pipeline,
          { toName: 'target', feedback: 'feedback' },
          { taskIndex: 0, currentCount: 2, maxRetries: 2 }
        )
      }).toThrow('Max retries exceeded at task 0: 2')
    })

    it('calls debug.print with rejection info', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'task' }]
      }

      pipelineDomain.resolveRejection(
        pipeline,
        { toName: 'target', feedback: 'feedback' },
        { taskIndex: 0, currentCount: 1, maxRetries: 3 }
      )

      expect(vi.mocked(debug.print)).toHaveBeenCalledWith("Rejecting to 'target' (retry 2/3)")
    })
  })

  describe('resolveScriptRejection', () => {
    it('returns undefined when script succeeds', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'echo'
      }
      const result: ScriptResult = {
        exitCode: 0,
        stdout: '',
        stderr: ''
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 0,
        currentCount: 0
      })

      expect(rejection).toBeUndefined()
    })

    it('returns undefined when script fails but no rejection target configured', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'false'
      }
      const result: ScriptResult = {
        exitCode: 1,
        stdout: 'Output',
        stderr: 'Error'
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 0,
        currentCount: 0
      })

      expect(rejection).toBeUndefined()
    })

    it('returns rejection result when script fails with rejection config', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'retry_target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'failing-cmd',
        rejected: { to: 'retry_target', max_retries: 2 }
      }
      const result: ScriptResult = {
        exitCode: 1,
        stdout: 'script output',
        stderr: 'error message'
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 0,
        currentCount: 0
      })

      expect(rejection).toBeDefined()
      expect(rejection?.newCount).toBe(1)
      expect(rejection?.targetIndex).toBe(0)
      expect(rejection?.context.feedback).toContain('script output')
      expect(rejection?.context.feedback).toContain('error message')
    })

    it('combines stdout and stderr in feedback', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'cmd',
        rejected: { to: 'target', max_retries: 1 }
      }
      const result: ScriptResult = {
        exitCode: 1,
        stdout: 'stdout content',
        stderr: 'stderr content'
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 0,
        currentCount: 0
      })

      expect(rejection?.context.feedback).toBe('stdout content\nstderr content')
    })

    it('handles empty stderr in feedback', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'cmd',
        rejected: { to: 'target', max_retries: 1 }
      }
      const result: ScriptResult = {
        exitCode: 1,
        stdout: 'some output',
        stderr: ''
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 0,
        currentCount: 0
      })

      expect(rejection?.context.feedback).toBe('some output')
    })

    it('increments retry count from current count', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'target', task: 'work' }]
      }
      const task: ScriptPipelineTask = {
        type: 'script',
        command: 'cmd',
        rejected: { to: 'target', max_retries: 3 }
      }
      const result: ScriptResult = {
        exitCode: 1,
        stdout: '',
        stderr: ''
      }

      const rejection = pipelineDomain.resolveScriptRejection(pipeline, task, result, {
        taskIndex: 2,
        currentCount: 2
      })

      expect(rejection?.newCount).toBe(3)
    })
  })
})

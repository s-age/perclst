import { vi, describe, it, expect, beforeEach } from 'vitest'
import type {
  AgentPipelineTask,
  Pipeline,
  PipelineRunOptions,
  RejectedContext
} from '@src/types/pipeline'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import { PipelineDomain } from '../../pipeline'

describe('PipelineDomain - utils', () => {
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

  describe('buildRejectedInstruction', () => {
    it('builds instruction with task, retry count, and feedback', () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'Fix the bug'
      }
      const rejected: RejectedContext = {
        retry_count: 2,
        task,
        feedback: 'Error: something failed'
      }

      const instruction = pipelineDomain.buildRejectedInstruction(task, rejected)

      expect(instruction).toContain('Fix the bug')
      expect(instruction).toContain('[Retry 2]')
      expect(instruction).toContain('Error: something failed')
      expect(instruction).toContain('The following script failed')
    })

    it('trims feedback in the instruction', () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'Do something'
      }
      const rejected: RejectedContext = {
        retry_count: 1,
        task,
        feedback: '  \n  Trimmed feedback  \n  '
      }

      const instruction = pipelineDomain.buildRejectedInstruction(task, rejected)

      expect(instruction).toContain('Trimmed feedback')
      expect(instruction).not.toContain('  \n  Trimmed feedback  \n  ')
    })
  })

  describe('getRejectionFeedback', () => {
    it('returns feedback from repository', async () => {
      vi.mocked(rejectionFeedbackRepo.getFeedback).mockResolvedValue('some feedback')

      const result = await pipelineDomain.getRejectionFeedback('taskName')

      expect(result).toBe('some feedback')
      expect(rejectionFeedbackRepo.getFeedback).toHaveBeenCalledWith('taskName')
    })

    it('returns undefined when no feedback exists', async () => {
      vi.mocked(rejectionFeedbackRepo.getFeedback).mockResolvedValue(undefined)

      const result = await pipelineDomain.getRejectionFeedback('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('getWorkingDirectory', () => {
    it('returns working directory from repository', () => {
      vi.mocked(rejectionFeedbackRepo.getCwd).mockReturnValue('/home/user/project')

      const result = pipelineDomain.getWorkingDirectory()

      expect(result).toBe('/home/user/project')
      expect(rejectionFeedbackRepo.getCwd).toHaveBeenCalled()
    })
  })

  describe('buildExecuteOptions', () => {
    it('uses task-level allowed_tools when specified', () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work',
        allowed_tools: ['Bash', 'WebFetch']
      }
      const options: PipelineRunOptions = {
        allowedTools: ['Read'],
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      const result = pipelineDomain.buildExecuteOptions(task, options)

      expect(result.allowedTools).toEqual(['Bash', 'WebFetch'])
    })

    it('falls back to options-level allowed_tools when task does not specify', () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work'
      }
      const options: PipelineRunOptions = {
        allowedTools: ['Read', 'Bash'],
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      const result = pipelineDomain.buildExecuteOptions(task, options)

      expect(result.allowedTools).toEqual(['Read', 'Bash'])
    })

    it('uses task-level model when specified', () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work',
        model: 'claude-haiku'
      }
      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      const result = pipelineDomain.buildExecuteOptions(task, options)

      expect(result.model).toBe('claude-haiku')
    })

    it('includes onStreamEvent callback from options', () => {
      const callback = vi.fn()
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work'
      }
      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000,
        onStreamEvent: callback
      }

      const result = pipelineDomain.buildExecuteOptions(task, options)

      expect(result.onStreamEvent).toBe(callback)
    })
  })

  describe('findOuterRejectionTarget', () => {
    it('returns index of first agent task', () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'script', name: 'script1', command: 'echo' },
          { type: 'agent', name: 'agent1', task: 'work' },
          { type: 'agent', name: 'agent2', task: 'more work' }
        ]
      }

      const index = pipelineDomain.findOuterRejectionTarget(pipeline)

      expect(index).toBe(1)
    })

    it('returns undefined when no agent task found', () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'script', name: 'script1', command: 'echo' },
          { type: 'script', name: 'script2', command: 'cat' }
        ]
      }

      const index = pipelineDomain.findOuterRejectionTarget(pipeline)

      expect(index).toBeUndefined()
    })

    it('returns zero when first task is agent', () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', name: 'agent1', task: 'work' },
          { type: 'script', name: 'script1', command: 'echo' }
        ]
      }

      const index = pipelineDomain.findOuterRejectionTarget(pipeline)

      expect(index).toBe(0)
    })

    it('returns undefined for empty pipeline', () => {
      const pipeline: Pipeline = {
        tasks: []
      }

      const index = pipelineDomain.findOuterRejectionTarget(pipeline)

      expect(index).toBeUndefined()
    })
  })
})

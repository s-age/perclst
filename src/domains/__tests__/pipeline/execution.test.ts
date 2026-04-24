import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { AgentPipelineTask, PipelineRunOptions, RejectedContext } from '@src/types/pipeline'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import { PipelineDomain } from '../../pipeline'

describe('PipelineDomain - execution', () => {
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

  describe('runWithLimit', () => {
    it('runs agent once when limit not exceeded', async () => {
      const session: Session = { id: 'session1', name: 'test' } as Session
      const agentResponse: AgentResponse = {
        message_count: 2,
        last_assistant_usage: undefined
      } as AgentResponse

      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const execOpts = { model: 'claude-opus' } as ExecuteOptions
      const result = await pipelineDomain.runWithLimit(session, 'instruction', false, {
        execOpts,
        limits: { maxTurns: 5, maxContextTokens: 5000 }
      })

      expect(result).toEqual(agentResponse)
      expect(agentDomain.run).toHaveBeenCalledTimes(1)
    })

    it('runs graceful termination when turn limit exceeded', async () => {
      const session: Session = { id: 'session1' } as Session
      const firstResponse: AgentResponse = {
        message_count: 10,
        last_assistant_usage: undefined
      } as AgentResponse
      const termResponse: AgentResponse = {
        message_count: 11,
        last_assistant_usage: undefined
      } as AgentResponse

      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(termResponse)

      const execOpts = { model: 'claude-opus' } as ExecuteOptions
      await pipelineDomain.runWithLimit(session, 'instruction', false, {
        execOpts,
        limits: { maxTurns: 5, maxContextTokens: -1 }
      })

      expect(agentDomain.run).toHaveBeenCalledTimes(2)
      const secondCall = vi.mocked(agentDomain.run).mock.calls[1]
      expect(secondCall[1]).toContain('reached the operation limit')
    })

    it('runs graceful termination when context token limit exceeded', async () => {
      const session: Session = { id: 'session1' } as Session
      const firstResponse: AgentResponse = {
        message_count: 2,
        last_assistant_usage: {
          input_tokens: 5000,
          output_tokens: 100,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse
      const termResponse: AgentResponse = {
        message_count: 3,
        last_assistant_usage: undefined
      } as AgentResponse

      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(termResponse)

      const execOpts = { model: 'claude-opus' } as ExecuteOptions
      await pipelineDomain.runWithLimit(session, 'instruction', false, {
        execOpts,
        limits: { maxTurns: -1, maxContextTokens: 4000 }
      })

      expect(agentDomain.run).toHaveBeenCalledTimes(2)
    })
  })

  describe('runAgentTask', () => {
    it('creates new session and runs agent task', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'task1'
      }
      const session: Session = { id: 'new-session-id' } as Session
      const agentResponse: AgentResponse = { message_count: 1 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(sessionDomain.create).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      const result = await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options)

      expect(result.action).toBe('started')
      expect(result.sessionId).toBe('new-session-id')
      expect(sessionDomain.create).toHaveBeenCalled()
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith('new-session-id', 'active')
    })

    it('resumes existing named session instead of creating new one', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'persistent-task'
      }
      const existingSession: Session = { id: 'existing-session-id' } as Session
      const agentResponse: AgentResponse = { message_count: 1 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(existingSession)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      const result = await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options)

      expect(result.action).toBe('resumed')
      expect(result.sessionId).toBe('existing-session-id')
      expect(sessionDomain.create).not.toHaveBeenCalled()
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith('existing-session-id', 'active')
    })

    it('includes task procedure when creating session', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'task-with-proc',
        procedure: 'meta-librarian/curate'
      }
      const session: Session = { id: 'session-id' } as Session
      const agentResponse: AgentResponse = { message_count: 1 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(sessionDomain.create).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options)

      expect(sessionDomain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          procedure: 'meta-librarian/curate'
        })
      )
    })

    it('uses rejected instruction when context provided', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'original task',
        name: 'retry-task'
      }
      const rejected: RejectedContext = {
        retry_count: 1,
        task,
        feedback: 'Previous failure'
      }
      const session: Session = { id: 'session-id' } as Session
      const agentResponse: AgentResponse = { message_count: 1 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(sessionDomain.create).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 10,
        maxContextTokens: 5000
      }

      await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options, rejected)

      const runCall = vi.mocked(agentDomain.run).mock.calls[0]
      expect(runCall[1]).toContain('[Retry 1]')
      expect(runCall[1]).toContain('Previous failure')
    })
  })

  describe('resumeNamedSession', () => {
    it('returns null when no existing session with name found', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work',
        name: 'nonexistent'
      }

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)

      const execOpts = { model: 'claude-opus' } as ExecuteOptions
      // eslint-disable-next-line local/no-any
      const result = await (pipelineDomain as any).resumeNamedSession(
        task,
        0,
        [0],
        'instruction',
        execOpts,
        5,
        5000
      )

      expect(result).toBeNull()
      expect(agentDomain.run).not.toHaveBeenCalled()
    })

    it('resumes existing session and returns result', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'work',
        name: 'existing'
      }
      const session: Session = { id: 'session-id' } as Session
      const agentResponse: AgentResponse = { message_count: 2 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run).mockResolvedValue(agentResponse)

      const execOpts = { model: 'claude-opus' } as ExecuteOptions
      // eslint-disable-next-line local/no-any
      const result = await (pipelineDomain as any).resumeNamedSession(
        task,
        { index: 0, taskPath: [0] },
        {
          instruction: 'new instruction',
          execOpts,
          limits: { maxTurns: 5, maxContextTokens: 5000 }
        }
      )

      expect(result).not.toBeNull()
      expect(result?.action).toBe('resumed')
      expect(result?.sessionId).toBe('session-id')
      expect(agentDomain.run).toHaveBeenCalledWith(
        session,
        'new instruction',
        true,
        expect.any(Object)
      )
    })
  })
})

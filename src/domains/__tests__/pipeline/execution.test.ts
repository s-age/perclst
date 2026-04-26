import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { AgentPipelineTask, PipelineRunOptions, RejectedContext } from '@src/types/pipeline'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { AgentResponse } from '@src/types/agent'
import { PipelineDomain } from '../../pipeline'

describe('PipelineDomain - execution', () => {
  let pipelineDomain: PipelineDomain
  let agentDomain: IAgentDomain
  let sessionDomain: ISessionDomain
  let rejectionFeedbackRepo: IRejectionFeedbackRepository

  beforeEach(() => {
    vi.clearAllMocks()

    agentDomain = {
      run: vi.fn(),
      isLimitExceeded: vi.fn().mockReturnValue(false)
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

    it('forwards task labels to session create', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'task-with-labels',
        labels: ['ci', 'nightly']
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
        expect.objectContaining({ labels: ['ci', 'nightly'] })
      )
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

    it('sends graceful termination prompt when turn limit is exceeded', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'task1'
      }
      const session: Session = { id: 'session-id' } as Session
      const firstResponse: AgentResponse = { message_count: 10 } as AgentResponse
      const termResponse: AgentResponse = { message_count: 11 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(sessionDomain.create).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(termResponse)
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValueOnce(true)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: 5,
        maxContextTokens: -1
      }

      await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options)

      expect(agentDomain.run).toHaveBeenCalledTimes(2)
      const secondCall = vi.mocked(agentDomain.run).mock.calls[1]
      expect(secondCall[1]).toContain('reached the operation limit')
    })

    it('sends graceful termination prompt when context token limit is exceeded', async () => {
      const task: AgentPipelineTask = {
        type: 'agent',
        task: 'do something',
        name: 'task1'
      }
      const session: Session = { id: 'session-id' } as Session
      const firstResponse: AgentResponse = { message_count: 2 } as AgentResponse
      const termResponse: AgentResponse = { message_count: 3 } as AgentResponse

      vi.mocked(sessionDomain.findByName).mockResolvedValue(null)
      vi.mocked(sessionDomain.create).mockResolvedValue(session)
      vi.mocked(sessionDomain.getPath).mockReturnValue('/path/to/session')
      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(termResponse)
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValueOnce(true)

      const options: PipelineRunOptions = {
        model: 'claude-opus',
        maxTurns: -1,
        maxContextTokens: 4000
      }

      await pipelineDomain.runAgentTask(task, { index: 0, taskPath: [0] }, options)

      expect(agentDomain.run).toHaveBeenCalledTimes(2)
    })
  })
})

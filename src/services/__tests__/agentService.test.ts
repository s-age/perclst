import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentService } from '../agentService'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'

const mockSession: Session = {
  id: 'test-session',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  procedure: 'conductor',
  claude_session_id: 'claude-id',
  working_dir: '/tmp',
  metadata: { status: 'active', tags: [] }
}

const mockResponse = {
  content: 'Mock response',
  model: 'mock-model',
  usage: { input_tokens: 10, output_tokens: 10 }
}

const SESSION_FILE_PATH = '/sessions/test-session.json'

describe('AgentService', () => {
  let sessionDomain: ISessionDomain
  let agentDomain: IAgentDomain
  let service: AgentService

  beforeEach(() => {
    sessionDomain = {
      create: vi.fn().mockResolvedValue(mockSession),
      get: vi.fn().mockResolvedValue(mockSession),
      getPath: vi.fn().mockReturnValue(SESSION_FILE_PATH),
      list: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn().mockResolvedValue(mockSession),
      updateStatus: vi.fn().mockResolvedValue({
        ...mockSession,
        metadata: { ...mockSession.metadata, status: 'active' }
      })
    }
    agentDomain = { run: vi.fn().mockResolvedValue(mockResponse) }
    service = new AgentService(sessionDomain, agentDomain)
  })

  describe('start', () => {
    it('creates session, runs agent, updates status, returns sessionId and response', async () => {
      const result = await service.start(
        'Do a task',
        { procedure: 'conductor', tags: ['tag1'] },
        { model: 'claude-opus-4-6' }
      )

      expect(sessionDomain.create).toHaveBeenCalledWith({ procedure: 'conductor', tags: ['tag1'] })
      expect(sessionDomain.getPath).toHaveBeenCalledWith(mockSession.id)
      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Do a task', false, {
        model: 'claude-opus-4-6',
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
      expect(result.sessionId).toBe(mockSession.id)
      expect(result.response).toBe(mockResponse)
    })

    it('works with default empty options', async () => {
      await service.start('Do a task', {})

      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Do a task', false, {
        sessionFilePath: SESSION_FILE_PATH
      })
    })
  })

  describe('resume', () => {
    it('loads session, runs agent, updates status, returns response', async () => {
      const result = await service.resume(mockSession.id, 'Continue', {
        model: 'claude-sonnet-4-6'
      })

      expect(sessionDomain.get).toHaveBeenCalledWith(mockSession.id)
      expect(sessionDomain.getPath).toHaveBeenCalledWith(mockSession.id)
      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Continue', true, {
        model: 'claude-sonnet-4-6',
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
      expect(result).toBe(mockResponse)
    })

    it('works with default empty options', async () => {
      await service.resume(mockSession.id, 'Continue')

      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Continue', true, {
        sessionFilePath: SESSION_FILE_PATH
      })
    })
  })
})

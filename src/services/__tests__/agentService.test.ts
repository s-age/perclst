import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentService } from '../agentService'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { Config } from '@src/types/config'

const mockSession: Session = {
  id: 'test-session',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  procedure: 'conductor',
  claude_session_id: 'claude-id',
  working_dir: '/tmp',
  metadata: { status: 'active', labels: [] }
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
    vi.clearAllMocks()
    sessionDomain = {
      create: vi.fn().mockResolvedValue(mockSession),
      save: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(mockSession),
      getPath: vi.fn().mockReturnValue(SESSION_FILE_PATH),
      list: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      findByName: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({
        ...mockSession,
        metadata: { ...mockSession.metadata, status: 'active' }
      })
    }
    agentDomain = {
      run: vi.fn().mockResolvedValue(mockResponse),
      resume: vi.fn().mockResolvedValue(mockResponse),
      isLimitExceeded: vi.fn().mockReturnValue(false),
      fork: vi.fn()
    }
    service = new AgentService(sessionDomain, agentDomain)
  })

  describe('resolveRunOptions', () => {
    it('should use provided options when all are defined', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          model: 'claude-opus-4-6',
          maxTurns: 5,
          maxContextTokens: 10000,
          allowedTools: ['Bash', 'WebFetch'],
          disallowedTools: ['Write']
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          model: 'claude-opus-4-6',
          maxTurns: 5,
          maxContextTokens: 10000,
          allowedTools: ['Bash', 'WebFetch'],
          disallowedTools: ['Write'],
          sessionFilePath: SESSION_FILE_PATH
        })
      )
    })

    it('should default maxTurns to -1 when option and config are undefined', async () => {
      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxTurns: -1,
          maxContextTokens: -1
        })
      )
    })

    it('should use maxTurns from config when option is undefined', async () => {
      const config: Config = {
        limits: { max_turns: 20, max_context_tokens: 50000 }
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxTurns: 20,
          maxContextTokens: 50000
        })
      )
    })

    it('should override config limits with option values', async () => {
      const config: Config = {
        limits: { max_turns: 20, max_context_tokens: 50000 }
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          maxTurns: 8,
          maxContextTokens: 20000
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxTurns: 8,
          maxContextTokens: 20000
        })
      )
    })

    it('should treat 0 as a valid maxTurns value and not override with defaults', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          maxTurns: 0,
          maxContextTokens: 0
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxTurns: 0,
          maxContextTokens: 0
        })
      )
    })

    it('should use allowedTools from options when defined', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          allowedTools: ['Bash']
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          allowedTools: ['Bash']
        })
      )
    })

    it('should use allowedTools from config when option is undefined', async () => {
      const config: Config = {
        allowed_tools: ['WebFetch', 'Bash']
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          allowedTools: ['WebFetch', 'Bash']
        })
      )
    })

    it('should use disallowedTools from options when defined', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          disallowedTools: ['Write']
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          disallowedTools: ['Write']
        })
      )
    })

    it('should use disallowedTools from config when option is undefined', async () => {
      const config: Config = {
        disallowed_tools: ['Edit', 'Bash']
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          disallowedTools: ['Edit', 'Bash']
        })
      )
    })

    it('should preserve non-overridden properties from options', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          model: 'claude-haiku-4-5',
          maxTurns: 10
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          model: 'claude-haiku-4-5',
          maxTurns: 10,
          maxContextTokens: -1
        })
      )
    })
  })

  describe('start', () => {
    it('should create session, run agent, update status, and return result', async () => {
      const result = await service.start(
        'Do a task',
        { procedure: 'conductor', labels: ['tag1'], working_dir: '/tmp' },
        { model: 'claude-opus-4-6' }
      )

      expect(sessionDomain.create).toHaveBeenCalledWith({
        procedure: 'conductor',
        labels: ['tag1'],
        working_dir: '/tmp'
      })
      expect(sessionDomain.getPath).toHaveBeenCalledWith(mockSession.id)
      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Do a task', false, {
        model: 'claude-opus-4-6',
        maxTurns: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(agentDomain.isLimitExceeded).toHaveBeenCalledWith(mockResponse, {
        model: 'claude-opus-4-6',
        maxTurns: -1,
        maxContextTokens: -1
      })
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
      expect(result.sessionId).toBe(mockSession.id)
      expect(result.response).toBe(mockResponse)
    })

    it('should work with default empty options', async () => {
      await service.start('Do a task', { working_dir: '/tmp' })

      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Do a task', false, {
        maxTurns: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
    })

    it('should run graceful termination when limit is exceeded', async () => {
      const gracefulResponse = { ...mockResponse, content: 'Graceful summary' }
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(gracefulResponse)

      const result = await service.start('Do a task', { working_dir: '/tmp' })

      expect(agentDomain.run).toHaveBeenCalledTimes(2)
      expect(agentDomain.run).toHaveBeenLastCalledWith(
        mockSession,
        expect.stringContaining('You have reached the operation limit'),
        true,
        expect.objectContaining({ sessionFilePath: SESSION_FILE_PATH })
      )
      expect(result.response).toBe(gracefulResponse)
    })

    it('should pass isMainTurn=false to first run, true to graceful termination', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)

      await service.start('Do a task', { working_dir: '/tmp' })

      expect(agentDomain.run).toHaveBeenNthCalledWith(
        1,
        mockSession,
        'Do a task',
        false,
        expect.any(Object)
      )
      expect(agentDomain.run).toHaveBeenNthCalledWith(
        2,
        mockSession,
        expect.any(String),
        true,
        expect.any(Object)
      )
    })

    it('should call updateStatus after limit check completes', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      vi.mocked(agentDomain.run)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)

      await service.start('Do a task', { working_dir: '/tmp' })

      const runCallCount = vi.mocked(agentDomain.run).mock.calls.length
      const updateStatusCallIndex = vi.mocked(sessionDomain.updateStatus).mock
        .invocationCallOrder[0]
      const lastRunCallIndex = vi.mocked(agentDomain.run).mock.invocationCallOrder[runCallCount - 1]

      expect(updateStatusCallIndex).toBeGreaterThan(lastRunCallIndex)
    })
  })

  describe('resume', () => {
    it('should load session, call resume, save session, update status, and return response', async () => {
      const result = await service.resume(mockSession.id, 'Continue', {
        model: 'claude-sonnet-4-6'
      })

      expect(sessionDomain.get).toHaveBeenCalledWith(mockSession.id)
      expect(sessionDomain.getPath).toHaveBeenCalledWith(mockSession.id)
      expect(agentDomain.resume).toHaveBeenCalledWith(mockSession, 'Continue', {
        model: 'claude-sonnet-4-6',
        maxTurns: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(sessionDomain.save).toHaveBeenCalledWith(mockSession)
      expect(agentDomain.isLimitExceeded).toHaveBeenCalledWith(mockResponse, {
        model: 'claude-sonnet-4-6',
        maxTurns: -1,
        maxContextTokens: -1
      })
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
      expect(result).toBe(mockResponse)
    })

    it('should work with default empty options', async () => {
      await service.resume(mockSession.id, 'Continue')

      expect(agentDomain.resume).toHaveBeenCalledWith(mockSession, 'Continue', {
        maxTurns: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
    })

    it('should save session before checking limit', async () => {
      await service.resume(mockSession.id, 'Continue')

      const saveCallIndex = vi.mocked(sessionDomain.save).mock.invocationCallOrder[0]
      const limitCheckIndex = vi.mocked(agentDomain.isLimitExceeded).mock.invocationCallOrder[0]

      expect(saveCallIndex).toBeLessThan(limitCheckIndex)
    })

    it('should run graceful termination when limit is exceeded', async () => {
      const gracefulResponse = { ...mockResponse, content: 'Graceful summary' }
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      vi.mocked(agentDomain.run).mockResolvedValueOnce(gracefulResponse)

      const result = await service.resume(mockSession.id, 'Continue')

      expect(agentDomain.run).toHaveBeenCalledTimes(1)
      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        expect.stringContaining('You have reached the operation limit'),
        true,
        expect.objectContaining({ sessionFilePath: SESSION_FILE_PATH })
      )
      expect(result).toBe(gracefulResponse)
    })

    it('should call agentDomain.run instead of resume when limit is exceeded', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      vi.mocked(agentDomain.run).mockResolvedValueOnce(mockResponse)

      await service.resume(mockSession.id, 'Continue')

      expect(agentDomain.resume).toHaveBeenCalledTimes(1)
      expect(agentDomain.run).toHaveBeenCalledTimes(1)
    })

    it('should update status to active after handling limit check', async () => {
      await service.resume(mockSession.id, 'Continue')

      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
    })

    it('should pass instruction to agentDomain.resume unchanged', async () => {
      const instruction = 'Continue with task X'

      await service.resume(mockSession.id, instruction)

      expect(agentDomain.resume).toHaveBeenCalledWith(mockSession, instruction, expect.any(Object))
    })
  })
})

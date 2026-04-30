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
      }),
      setLabels: vi.fn(),
      addLabels: vi.fn(),
      resolveId: vi.fn(),
      createRewind: vi.fn(),
      sweep: vi.fn()
    }
    agentDomain = {
      run: vi.fn().mockResolvedValue(mockResponse),
      resume: vi.fn().mockResolvedValue(mockResponse),
      isLimitExceeded: vi.fn().mockReturnValue(false),
      fork: vi.fn(),
      buildChatArgs: vi.fn(),
      chat: vi.fn()
    }
    service = new AgentService(sessionDomain, agentDomain, {})
  })

  describe('resolveRunOptions', () => {
    it('should use provided options when all are defined', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          model: 'claude-opus-4-6',
          maxMessages: 5,
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
          maxMessages: 5,
          maxContextTokens: 10000,
          allowedTools: ['Bash', 'WebFetch'],
          disallowedTools: ['Write'],
          sessionFilePath: SESSION_FILE_PATH
        })
      )
    })

    it('should default maxMessages to -1 when option and config are undefined', async () => {
      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxMessages: -1,
          maxContextTokens: -1
        })
      )
    })

    it('should use maxMessages from config when option is undefined', async () => {
      const config: Config = {
        limits: { max_messages: 20, max_context_tokens: 50000 }
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start('Do a task', { working_dir: '/tmp' }, {})

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxMessages: 20,
          maxContextTokens: 50000
        })
      )
    })

    it('should override config limits with option values', async () => {
      const config: Config = {
        limits: { max_messages: 20, max_context_tokens: 50000 }
      }
      service = new AgentService(sessionDomain, agentDomain, config)

      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          maxMessages: 8,
          maxContextTokens: 20000
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxMessages: 8,
          maxContextTokens: 20000
        })
      )
    })

    it('should treat 0 as a valid maxMessages value and not override with defaults', async () => {
      await service.start(
        'Do a task',
        { working_dir: '/tmp' },
        {
          maxMessages: 0,
          maxContextTokens: 0
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          maxMessages: 0,
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
          maxMessages: 10
        }
      )

      expect(agentDomain.run).toHaveBeenCalledWith(
        mockSession,
        'Do a task',
        false,
        expect.objectContaining({
          model: 'claude-haiku-4-5',
          maxMessages: 10,
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
        maxMessages: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(agentDomain.isLimitExceeded).toHaveBeenCalledWith(mockResponse, {
        model: 'claude-opus-4-6',
        maxMessages: -1,
        maxContextTokens: -1
      })
      expect(sessionDomain.save).toHaveBeenCalledWith(mockSession)
      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(1, mockSession.id, 'active')
      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(2, mockSession.id, 'completed')
      expect(result.sessionId).toBe(mockSession.id)
      expect(result.response).toBe(mockResponse)
    })

    it('should save session before completed status update', async () => {
      await service.start('Do a task', { working_dir: '/tmp' })

      const saveCallIndex = vi.mocked(sessionDomain.save).mock.invocationCallOrder[0]
      const completedCallIndex = vi.mocked(sessionDomain.updateStatus).mock.invocationCallOrder[1]

      expect(saveCallIndex).toBeLessThan(completedCallIndex)
    })

    it('should work with default empty options', async () => {
      await service.start('Do a task', { working_dir: '/tmp' })

      expect(agentDomain.run).toHaveBeenCalledWith(mockSession, 'Do a task', false, {
        maxMessages: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
    })

    it('should call onLimitExceeded when limit is exceeded', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      const onLimitExceeded = vi.fn()

      const result = await service.start('Do a task', { working_dir: '/tmp' }, { onLimitExceeded })

      expect(agentDomain.run).toHaveBeenCalledTimes(1)
      expect(onLimitExceeded).toHaveBeenCalledTimes(1)
      expect(result.response).toBe(mockResponse)
    })

    it('should not call onLimitExceeded when limit is not exceeded', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(false)
      const onLimitExceeded = vi.fn()

      await service.start('Do a task', { working_dir: '/tmp' }, { onLimitExceeded })

      expect(onLimitExceeded).not.toHaveBeenCalled()
    })

    it('should call updateStatus with completed after limit check', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)

      await service.start('Do a task', { working_dir: '/tmp' })

      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'completed')
    })

    it('should update status to failed when run throws', async () => {
      vi.mocked(agentDomain.run).mockRejectedValue(new Error('run failed'))

      await expect(service.start('Do a task', { working_dir: '/tmp' })).rejects.toThrow(
        'run failed'
      )

      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'failed')
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
        maxMessages: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
      expect(sessionDomain.save).toHaveBeenCalledWith(mockSession)
      expect(agentDomain.isLimitExceeded).toHaveBeenCalledWith(mockResponse, {
        model: 'claude-sonnet-4-6',
        maxMessages: -1,
        maxContextTokens: -1
      })
      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(1, mockSession.id, 'active')
      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(2, mockSession.id, 'completed')
      expect(result).toBe(mockResponse)
    })

    it('should work with default empty options', async () => {
      await service.resume(mockSession.id, 'Continue')

      expect(agentDomain.resume).toHaveBeenCalledWith(mockSession, 'Continue', {
        maxMessages: -1,
        maxContextTokens: -1,
        sessionFilePath: SESSION_FILE_PATH
      })
    })

    it('should save session before completed status update', async () => {
      await service.resume(mockSession.id, 'Continue')

      const saveCallIndex = vi.mocked(sessionDomain.save).mock.invocationCallOrder[0]
      const completedCallIndex = vi.mocked(sessionDomain.updateStatus).mock.invocationCallOrder[1]

      expect(saveCallIndex).toBeLessThan(completedCallIndex)
    })

    it('should call onLimitExceeded when limit is exceeded', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(true)
      const onLimitExceeded = vi.fn()

      const result = await service.resume(mockSession.id, 'Continue', { onLimitExceeded })

      expect(agentDomain.resume).toHaveBeenCalledTimes(1)
      expect(agentDomain.run).not.toHaveBeenCalled()
      expect(onLimitExceeded).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockResponse)
    })

    it('should not call onLimitExceeded when limit is not exceeded', async () => {
      vi.mocked(agentDomain.isLimitExceeded).mockReturnValue(false)
      const onLimitExceeded = vi.fn()

      await service.resume(mockSession.id, 'Continue', { onLimitExceeded })

      expect(onLimitExceeded).not.toHaveBeenCalled()
    })

    it('should update status to active before run and completed after', async () => {
      await service.resume(mockSession.id, 'Continue')

      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(1, mockSession.id, 'active')
      expect(sessionDomain.updateStatus).toHaveBeenNthCalledWith(2, mockSession.id, 'completed')
    })

    it('should update status to failed when resume throws', async () => {
      vi.mocked(agentDomain.resume).mockRejectedValue(new Error('resume failed'))

      await expect(service.resume(mockSession.id, 'Continue')).rejects.toThrow('resume failed')

      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'active')
      expect(sessionDomain.updateStatus).toHaveBeenCalledWith(mockSession.id, 'failed')
    })

    it('should pass instruction to agentDomain.resume unchanged', async () => {
      const instruction = 'Continue with task X'

      await service.resume(mockSession.id, instruction)

      expect(agentDomain.resume).toHaveBeenCalledWith(mockSession, instruction, expect.any(Object))
    })
  })
})

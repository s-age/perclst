import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IClaudeCodeRepository, IProcedureRepository } from '@src/repositories/ports/agent'
import type { AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import { AgentDomain, HEADLESS_SKILL_NOTE } from '../agent'
import { APIError } from '@src/errors/apiError'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    procedure: 'conductor',
    claude_session_id: 'claude-id',
    working_dir: '/tmp',
    metadata: { status: 'active' as const, labels: [] },
    ...overrides
  }
}

describe('AgentDomain', () => {
  let domain: AgentDomain
  let claudeCodeRepo: IClaudeCodeRepository
  let procedureRepo: IProcedureRepository
  let session: Session

  beforeEach(() => {
    vi.clearAllMocks()
    session = makeSession()

    claudeCodeRepo = {
      dispatch: vi.fn().mockResolvedValue({
        content: 'Mock response',
        thoughts: [],
        tool_history: [],
        usage: { input_tokens: 10, output_tokens: 10 },
        message_count: 1
      }),
      spawnInteractive: vi.fn()
    }

    procedureRepo = {
      load: vi.fn()
    }

    domain = new AgentDomain(DEFAULT_MODEL, claudeCodeRepo, procedureRepo)
  })

  it('should run a task with the procedure system prompt', async () => {
    vi.mocked(procedureRepo.load).mockReturnValue('You are a conductor.')

    const response = await domain.run(session, 'Hello', false)

    expect(response.content).toBe('Mock response')
    expect(procedureRepo.load).toHaveBeenCalledWith('conductor', '/tmp')
    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: `${HEADLESS_SKILL_NOTE}\n\nYou are a conductor.`,
        prompt: 'Hello'
      }),
      undefined,
      undefined
    )
  })

  it('should use headless skill note as system prompt when no procedure is set', async () => {
    const sessionWithoutProcedure = { ...session, procedure: undefined }

    await domain.run(sessionWithoutProcedure, 'Hello', false)

    expect(procedureRepo.load).not.toHaveBeenCalled()
    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: HEADLESS_SKILL_NOTE
      }),
      undefined,
      undefined
    )
  })

  it('should dispatch a resume action when resuming', async () => {
    await domain.run(session, 'Continue', true)

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resume',
        prompt: 'Continue'
      }),
      undefined,
      undefined
    )
  })

  it('should override model from options', async () => {
    await domain.run(session, 'Hello', false, { model: 'claude-opus-4-6' })

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6'
      }),
      undefined,
      undefined
    )
    expect(session.model).toBe('claude-opus-4-6')
  })

  it('should use session.model when no options.model is provided', async () => {
    const sessionWithModel = { ...session, model: 'claude-opus-4-6' }
    await domain.run(sessionWithModel, 'Hello', false)

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6'
      }),
      undefined,
      undefined
    )
  })

  it('should fall back to default model when neither options nor session has model', async () => {
    await domain.run(session, 'Hello', false)

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: DEFAULT_MODEL
      }),
      undefined,
      undefined
    )
    expect(session.model).toBe(DEFAULT_MODEL)
  })

  it('should prefer options.model over session.model', async () => {
    const sessionWithModel = { ...session, model: 'claude-haiku-4-5' }
    await domain.run(sessionWithModel, 'Hello', false, { model: 'claude-opus-4-6' })

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6'
      }),
      undefined,
      undefined
    )
    expect(sessionWithModel.model).toBe('claude-opus-4-6')
  })

  it('should throw APIError when run response content is empty', async () => {
    vi.mocked(claudeCodeRepo.dispatch).mockResolvedValueOnce({
      content: '',
      thoughts: [],
      tool_history: [],
      usage: { input_tokens: 0, output_tokens: 0 },
      message_count: 0
    })

    await expect(domain.run(session, 'Hello', false)).rejects.toThrow(APIError)
  })

  it('should include thoughts in response when raw response has thinking blocks', async () => {
    const thoughts = [{ type: 'thinking' as const, thinking: 'deliberating...' }]
    vi.mocked(claudeCodeRepo.dispatch).mockResolvedValueOnce({
      content: 'Answer',
      thoughts,
      tool_history: [],
      usage: { input_tokens: 10, output_tokens: 10 },
      message_count: 1
    })

    const response = await domain.run(session, 'Hello', false)

    expect(response.thoughts).toEqual(thoughts)
  })

  it('should omit thoughts from response when raw response has no thinking blocks', async () => {
    const response = await domain.run(session, 'Hello', false)

    expect(response.thoughts).toBeUndefined()
  })

  it('should include tool_history in response when raw response has tool records', async () => {
    const toolHistory = [{ id: 'tc-1', name: 'Bash', input: { command: 'ls' } }]
    vi.mocked(claudeCodeRepo.dispatch).mockResolvedValueOnce({
      content: 'Done',
      thoughts: [],
      tool_history: toolHistory,
      usage: { input_tokens: 5, output_tokens: 5 },
      message_count: 1
    })

    const response = await domain.run(session, 'Hello', false)

    expect(response.tool_history).toEqual(toolHistory)
  })

  it('should omit tool_history from response when raw response has no tool records', async () => {
    const response = await domain.run(session, 'Hello', false)

    expect(response.tool_history).toBeUndefined()
  })

  describe('isLimitExceeded', () => {
    const makeResponse = (overrides: Partial<AgentResponse> = {}): AgentResponse => ({
      content: 'ok',
      model: 'claude-cli',
      usage: { input_tokens: 0, output_tokens: 0 },
      ...overrides
    })

    it('should return false when no limits are set', () => {
      expect(domain.isLimitExceeded(makeResponse({ messages_total: 99 }), {})).toBe(false)
    })

    it('should return false when messages_total is below maxMessages', () => {
      expect(domain.isLimitExceeded(makeResponse({ messages_total: 4 }), { maxMessages: 5 })).toBe(
        false
      )
    })

    it('should return true when messages_total reaches maxMessages', () => {
      expect(domain.isLimitExceeded(makeResponse({ messages_total: 5 }), { maxMessages: 5 })).toBe(
        true
      )
    })

    it('should fall back to message_count when messages_total is absent', () => {
      expect(domain.isLimitExceeded(makeResponse({ message_count: 5 }), { maxMessages: 5 })).toBe(
        true
      )
    })

    it('should return false when context tokens are below maxContextTokens', () => {
      const response = makeResponse({
        last_assistant_usage: { input_tokens: 99, output_tokens: 0 }
      })
      expect(domain.isLimitExceeded(response, { maxContextTokens: 100 })).toBe(false)
    })

    it('should return true when context tokens reach maxContextTokens', () => {
      const response = makeResponse({
        last_assistant_usage: {
          input_tokens: 50,
          output_tokens: 0,
          cache_read_input_tokens: 30,
          cache_creation_input_tokens: 20
        }
      })
      expect(domain.isLimitExceeded(response, { maxContextTokens: 100 })).toBe(true)
    })

    it('should return false when last_assistant_usage is absent and maxContextTokens is set', () => {
      expect(domain.isLimitExceeded(makeResponse(), { maxContextTokens: 100 })).toBe(false)
    })
  })

  describe('resume', () => {
    it('should call run with isResume=true when no rewind is active', async () => {
      const noRewindSession = { ...session, procedure: undefined }
      await domain.resume(noRewindSession, 'Continue')

      expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'resume' }),
        undefined,
        undefined
      )
    })

    it('should call fork and clear rewind fields when rewind_source_claude_session_id is set', async () => {
      const rewindSession = {
        ...session,
        rewind_source_claude_session_id: 'source-claude-id',
        rewind_to_message_id: 'msg-7'
      }

      await domain.resume(rewindSession, 'Resume from rewind')

      expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fork',
          originalClaudeSessionId: 'source-claude-id'
        }),
        undefined,
        undefined
      )
      expect(rewindSession.rewind_source_claude_session_id).toBeUndefined()
      expect(rewindSession.rewind_to_message_id).toBeUndefined()
    })
  })

  describe('fork', () => {
    const originalSession = makeSession({
      id: 'original',
      claude_session_id: 'original-claude-id',
      working_dir: '/original'
    })

    const newSession = makeSession({
      id: 'new-fork',
      claude_session_id: 'new-claude-id',
      working_dir: '/fork'
    })

    it('should dispatch a fork action with the original and new session identifiers', async () => {
      const response = await domain.fork(originalSession, newSession, 'Fork instruction')

      expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fork',
          originalClaudeSessionId: 'original-claude-id',
          sessionId: 'new-claude-id'
        }),
        undefined,
        undefined
      )
      expect(response.content).toBe('Mock response')
    })

    it('should throw APIError when fork response content is empty', async () => {
      vi.mocked(claudeCodeRepo.dispatch).mockResolvedValueOnce({
        content: '',
        thoughts: [],
        tool_history: [],
        usage: { input_tokens: 0, output_tokens: 0 },
        message_count: 0
      })

      await expect(domain.fork(originalSession, newSession, 'Fork')).rejects.toThrow(APIError)
    })
  })

  describe('buildChatArgs', () => {
    it('should include --model when session has model', () => {
      const s = { ...session, model: 'claude-opus-4-6' }
      const args = domain.buildChatArgs(s)

      expect(args).toEqual(['--resume', 'claude-id', '--model', 'claude-opus-4-6'])
    })

    it('should omit --model when session has no model', () => {
      const s = makeSession()
      const args = domain.buildChatArgs(s)

      expect(args).toEqual(['--resume', 'claude-id'])
    })

    it('should include --model in rewind args', () => {
      const s = {
        ...session,
        model: 'claude-opus-4-6',
        rewind_source_claude_session_id: 'source-id',
        rewind_to_message_id: 'msg-3'
      }
      const args = domain.buildChatArgs(s)

      expect(args).toEqual([
        '--resume',
        'source-id',
        '--fork-session',
        '--session-id',
        'claude-id',
        '--model',
        'claude-opus-4-6',
        '--resume-session-at',
        'msg-3'
      ])
    })
  })
})

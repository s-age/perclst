import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import type { Session } from '@src/types/session'
import type {
  AnalysisSummary,
  AssistantTurnEntry,
  ClaudeSessionData,
  SessionStats
} from '@src/types/analysis'
import { AnalyzeDomain } from '../analyze'

const mockSessionDomain: ISessionDomain = {
  create: vi.fn(),
  save: vi.fn(),
  get: vi.fn(),
  getPath: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  updateStatus: vi.fn(),
  rename: vi.fn(),
  setLabels: vi.fn(),
  addLabels: vi.fn(),
  findByName: vi.fn(),
  resolveId: vi.fn(),
  createRewind: vi.fn(),
  sweep: vi.fn()
}

const mockClaudeSessionRepo: IClaudeSessionRepository = {
  findEncodedDirBySessionId: vi.fn(),
  decodeWorkingDir: vi.fn(),
  validateSessionAtDir: vi.fn(),
  readSession: vi.fn(),
  scanSessionStats: vi.fn(),
  getAssistantTurns: vi.fn()
}

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  claude_session_id: 'claude-abc',
  working_dir: '/home/user/project',
  metadata: { status: 'active', labels: [] },
  ...overrides
})

const makeSessionData = (): ClaudeSessionData => ({
  turns: [],
  tokens: {
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalCacheCreation: 0,
    contextWindow: 0
  }
})

const makeSessionStats = (): SessionStats => ({
  apiCalls: 0,
  toolCalls: 0,
  tokens: {
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalCacheCreation: 0,
    contextWindow: 0
  }
})

describe('AnalyzeDomain', () => {
  let domain: AnalyzeDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new AnalyzeDomain(mockSessionDomain, mockClaudeSessionRepo)
  })

  describe('analyze', () => {
    it('should return session and summary for the given sessionId', async () => {
      const session = makeSession()
      const sessionData = makeSessionData()
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.readSession).mockReturnValue(sessionData)

      const result = await domain.analyze('session-1')

      expect(mockSessionDomain.get).toHaveBeenCalledWith('session-1')
      expect(mockClaudeSessionRepo.readSession).toHaveBeenCalledWith(
        session.claude_session_id,
        session.working_dir,
        undefined
      )
      const expectedSummary: AnalysisSummary = {
        turns: [],
        turnsBreakdown: {
          userInstructions: 0,
          apiCalls: 0,
          toolCalls: 0,
          toolResults: 0,
          total: 0
        },
        toolUses: [],
        tokens: {
          totalInput: 0,
          totalOutput: 0,
          totalCacheRead: 0,
          totalCacheCreation: 0,
          contextWindow: 0
        }
      }
      expect(result).toEqual({ session, summary: expectedSummary })
    })

    it('should read from rewind_source_claude_session_id when set', async () => {
      const session = makeSession({
        rewind_source_claude_session_id: 'source-xyz',
        rewind_to_message_id: 'msg-5'
      })
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.readSession).mockReturnValue(makeSessionData())

      await domain.analyze('session-1')

      expect(mockClaudeSessionRepo.readSession).toHaveBeenCalledWith(
        'source-xyz',
        session.working_dir,
        'msg-5'
      )
    })
  })

  describe('getRewindTurns', () => {
    it('should return all turns reversed with index mapping when no rewind fields are set', async () => {
      const session = makeSession()
      const turns: AssistantTurnEntry[] = [
        { uuid: 'u1', text: 'first' },
        { uuid: 'u2', text: 'second' },
        { uuid: 'u3', text: 'third' }
      ]
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.getAssistantTurns).mockReturnValue(turns)

      const result = await domain.getRewindTurns('session-1')

      expect(mockClaudeSessionRepo.getAssistantTurns).toHaveBeenCalledWith(
        session.claude_session_id,
        session.working_dir
      )
      expect(result).toEqual([
        { index: 0, uuid: 'u3', text: 'third' },
        { index: 1, uuid: 'u2', text: 'second' },
        { index: 2, uuid: 'u1', text: 'first' }
      ])
    })

    it('should use rewind_source_claude_session_id when set', async () => {
      const session = makeSession({ rewind_source_claude_session_id: 'claude-source-xyz' })
      const turns: AssistantTurnEntry[] = [{ uuid: 'u1', text: 'only' }]
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.getAssistantTurns).mockReturnValue(turns)

      await domain.getRewindTurns('session-1')

      expect(mockClaudeSessionRepo.getAssistantTurns).toHaveBeenCalledWith(
        'claude-source-xyz',
        session.working_dir
      )
    })

    it('should slice turns up to and including the rewind_to_message_id turn', async () => {
      const session = makeSession({ rewind_to_message_id: 'u2' })
      const turns: AssistantTurnEntry[] = [
        { uuid: 'u1', text: 'first' },
        { uuid: 'u2', text: 'second' },
        { uuid: 'u3', text: 'third' }
      ]
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.getAssistantTurns).mockReturnValue(turns)

      const result = await domain.getRewindTurns('session-1')

      expect(result).toEqual([
        { index: 0, uuid: 'u2', text: 'second' },
        { index: 1, uuid: 'u1', text: 'first' }
      ])
    })

    it('should return all turns reversed when rewind_to_message_id does not match any turn', async () => {
      const session = makeSession({ rewind_to_message_id: 'no-such-uuid' })
      const turns: AssistantTurnEntry[] = [
        { uuid: 'u1', text: 'first' },
        { uuid: 'u2', text: 'second' }
      ]
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.getAssistantTurns).mockReturnValue(turns)

      const result = await domain.getRewindTurns('session-1')

      expect(result).toEqual([
        { index: 0, uuid: 'u2', text: 'second' },
        { index: 1, uuid: 'u1', text: 'first' }
      ])
    })

    it('should return an empty array when there are no assistant turns', async () => {
      const session = makeSession()
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.getAssistantTurns).mockReturnValue([])

      const result = await domain.getRewindTurns('session-1')

      expect(result).toEqual([])
    })
  })

  describe('formatTurns', () => {
    it('should return flattened turn rows from the provided turns', () => {
      const turns = [
        { userMessage: 'Hello', toolCalls: [] },
        { assistantText: 'Response', toolCalls: [] }
      ]

      const result = domain.formatTurns(turns, {})

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ n: 1, role: 'user', content: 'Hello' })
      expect(result[1]).toEqual({ n: 2, role: 'assistant', content: 'Response' })
    })

    it('should apply a tail filter to the flattened rows', () => {
      const turns = [
        { userMessage: 'First', toolCalls: [] },
        { assistantText: 'Second', toolCalls: [] },
        { userMessage: 'Third', toolCalls: [] }
      ]

      const result = domain.formatTurns(turns, { tail: 2 })

      expect(result).toHaveLength(2)
      expect(result[0].content).toBe('Second')
      expect(result[1].content).toBe('Third')
    })
  })

  describe('summarize', () => {
    it('should return an empty array when there are no sessions', async () => {
      vi.mocked(mockSessionDomain.list).mockResolvedValue([])

      const result = await domain.summarize({})

      expect(result).toEqual([])
    })

    it('should build a summary row for each session', async () => {
      const session = makeSession()
      vi.mocked(mockSessionDomain.list).mockResolvedValue([session])
      vi.mocked(mockClaudeSessionRepo.scanSessionStats).mockReturnValue(makeSessionStats())

      const result = await domain.summarize({})

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('session-1')
    })

    it('should use session.name when present and fall back to id otherwise', async () => {
      const withName = makeSession({ name: 'My Session' })
      const withoutName = makeSession({ id: 'session-2' })
      vi.mocked(mockSessionDomain.list).mockResolvedValue([withName, withoutName])
      vi.mocked(mockClaudeSessionRepo.scanSessionStats).mockReturnValue(makeSessionStats())

      const result = await domain.summarize({})

      expect(result[0].name).toBe('My Session')
      expect(result[1].name).toBe('session-2')
    })

    it('should read from rewind_source_claude_session_id when set', async () => {
      const session = makeSession({ rewind_source_claude_session_id: 'source-abc' })
      vi.mocked(mockSessionDomain.list).mockResolvedValue([session])
      vi.mocked(mockClaudeSessionRepo.scanSessionStats).mockReturnValue(makeSessionStats())

      await domain.summarize({})

      expect(mockClaudeSessionRepo.scanSessionStats).toHaveBeenCalledWith(
        'source-abc',
        session.working_dir,
        undefined
      )
    })

    it('should skip sessions whose JSONL file cannot be read', async () => {
      const ok = makeSession({ id: 'ok-session' })
      const bad = makeSession({ id: 'bad-session' })
      vi.mocked(mockSessionDomain.list).mockResolvedValue([ok, bad])
      vi.mocked(mockClaudeSessionRepo.scanSessionStats)
        .mockReturnValueOnce(makeSessionStats())
        .mockImplementationOnce(() => {
          throw new Error('ENOENT')
        })

      const result = await domain.summarize({})

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ok-session')
    })
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import type { Session } from '@src/types/session'
import type { AnalysisSummary, AssistantTurnEntry } from '@src/types/analysis'
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
  findByName: vi.fn()
}

const mockClaudeSessionRepo: IClaudeSessionRepository = {
  findEncodedDirBySessionId: vi.fn(),
  decodeWorkingDir: vi.fn(),
  validateSessionAtDir: vi.fn(),
  readSession: vi.fn(),
  getAssistantTurns: vi.fn()
}

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  claude_session_id: 'claude-abc',
  working_dir: '/home/user/project',
  metadata: { status: 'active', tags: [] },
  ...overrides
})

const makeSummary = (): AnalysisSummary => ({
  turns: [],
  turnsBreakdown: { userInstructions: 0, toolUse: 0, assistantResponse: 0, total: 0 },
  toolUses: [],
  tokens: { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0 }
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
      const summary = makeSummary()
      vi.mocked(mockSessionDomain.get).mockResolvedValue(session)
      vi.mocked(mockClaudeSessionRepo.readSession).mockReturnValue(summary)

      const result = await domain.analyze('session-1')

      expect(mockSessionDomain.get).toHaveBeenCalledWith('session-1')
      expect(mockClaudeSessionRepo.readSession).toHaveBeenCalledWith(
        session.claude_session_id,
        session.working_dir,
        undefined
      )
      expect(result).toEqual({ session, summary })
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
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyzeService } from '../analyzeService'
import type { AnalyzeResult, RewindTurn, ClaudeCodeTurn } from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'
import type { IAnalyzeDomain } from '@src/domains/ports/analysis'
import type { Session } from '@src/types/session'

const mockSession: Session = {
  id: 'session-123',
  created_at: '2024-01-15T10:30:00.000Z',
  updated_at: '2024-01-15T10:35:00.000Z',
  procedure: 'test-procedure',
  claude_session_id: 'claude-session-456',
  working_dir: '/home/user/project',
  metadata: { status: 'active', labels: ['test', 'analysis'] }
}

const mockAnalyzeResult: AnalyzeResult = {
  session: mockSession,
  summary: {
    turns: [
      {
        userMessage: 'Analyze this code',
        toolCalls: [
          {
            name: 'Read',
            input: { file_path: '/src/index.ts' },
            result: 'file contents',
            isError: false
          }
        ],
        assistantText: 'Here is the analysis',
        thinkingBlocks: ['Let me analyze this'],
        usage: {
          input_tokens: 100,
          output_tokens: 150,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      }
    ],
    turnsBreakdown: {
      userInstructions: 1,
      toolUse: 1,
      assistantResponse: 1,
      total: 3
    },
    toolUses: [
      {
        name: 'Read',
        input: { file_path: '/src/index.ts' },
        isError: false
      }
    ],
    tokens: {
      totalInput: 100,
      totalOutput: 150,
      totalCacheRead: 0,
      totalCacheCreation: 0,
      contextWindow: 100
    }
  }
}

const mockRewindTurns: RewindTurn[] = [
  { index: 0, uuid: 'uuid-1', text: 'User instruction 1' },
  { index: 1, uuid: 'uuid-2', text: 'Assistant response' },
  { index: 2, uuid: 'uuid-3', text: 'User instruction 2' }
]

function makeMockDomain(): IAnalyzeDomain {
  return {
    analyze: vi.fn().mockResolvedValue(mockAnalyzeResult),
    getRewindTurns: vi.fn().mockResolvedValue(mockRewindTurns),
    formatTurns: vi.fn()
  }
}

describe('AnalyzeService', () => {
  let domain: IAnalyzeDomain
  let service: AnalyzeService

  beforeEach(() => {
    vi.clearAllMocks()
    domain = makeMockDomain()
    service = new AnalyzeService(domain)
  })

  describe('analyze', () => {
    it('delegates analyze to domain with sessionId', async () => {
      const result = await service.analyze('session-123')
      expect(domain.analyze).toHaveBeenCalledWith('session-123')
      expect(result).toBe(mockAnalyzeResult)
    })

    it('returns complete AnalyzeResult with session, summary, and tokens', async () => {
      const result = await service.analyze('session-123')
      expect(result.session.id).toBe('session-123')
      expect(result.summary.turns).toHaveLength(1)
      expect(result.summary.toolUses).toHaveLength(1)
      expect(result.summary.tokens.totalInput).toBe(100)
    })

    it('delegates analyze call exactly once', async () => {
      await service.analyze('session-123')
      expect(domain.analyze).toHaveBeenCalledTimes(1)
    })

    it('propagates domain errors when analyze throws', async () => {
      const error = new Error('Session not found')
      vi.mocked(domain.analyze).mockRejectedValueOnce(error)
      await expect(service.analyze('nonexistent')).rejects.toThrow('Session not found')
    })
  })

  describe('getRewindTurns', () => {
    it('delegates getRewindTurns to domain with sessionId', async () => {
      const result = await service.getRewindTurns('session-123')
      expect(domain.getRewindTurns).toHaveBeenCalledWith('session-123')
      expect(result).toBe(mockRewindTurns)
    })

    it('returns array of RewindTurn objects', async () => {
      const result = await service.getRewindTurns('session-123')
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(3)
    })

    it('returns RewindTurn with correct structure', async () => {
      const result = await service.getRewindTurns('session-123')
      const turn = result[0]
      expect(turn.index).toBe(0)
      expect(turn.uuid).toBe('uuid-1')
      expect(turn.text).toBe('User instruction 1')
    })

    it('delegates getRewindTurns call exactly once', async () => {
      await service.getRewindTurns('session-123')
      expect(domain.getRewindTurns).toHaveBeenCalledTimes(1)
    })

    it('propagates domain errors when getRewindTurns throws', async () => {
      const error = new Error('Failed to load session')
      vi.mocked(domain.getRewindTurns).mockRejectedValueOnce(error)
      await expect(service.getRewindTurns('session-123')).rejects.toThrow('Failed to load session')
    })

    it('returns empty array when no rewind turns exist', async () => {
      vi.mocked(domain.getRewindTurns).mockResolvedValueOnce([])
      const result = await service.getRewindTurns('session-123')
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  describe('formatTurns', () => {
    const mockTurns: ClaudeCodeTurn[] = [{ toolCalls: [], userMessage: 'hello' }]
    const filteredRows: TurnRow[] = [{ n: 1, role: 'user', content: 'hello' }]
    const filter: RowFilter = { head: 10 }

    beforeEach(() => {
      vi.mocked(domain.formatTurns).mockReturnValue(filteredRows)
    })

    it('delegates to domain with turns and filter', () => {
      service.formatTurns(mockTurns, filter)
      expect(domain.formatTurns).toHaveBeenCalledWith(mockTurns, filter)
    })

    it('returns domain result', () => {
      const result = service.formatTurns(mockTurns, filter)
      expect(result).toBe(filteredRows)
    })
  })

  describe('resolveTurnByIndex', () => {
    it('returns undefined when index is 0', async () => {
      const result = await service.resolveTurnByIndex('session-123', 0)
      expect(result).toBeUndefined()
    })

    it('does not call domain when index is 0', async () => {
      await service.resolveTurnByIndex('session-123', 0)
      expect(domain.getRewindTurns).not.toHaveBeenCalled()
    })

    it('returns uuid of the turn at the given index', async () => {
      const result = await service.resolveTurnByIndex('session-123', 1)
      expect(result).toBe('uuid-2')
    })

    it('throws RangeError when index exceeds available turns', async () => {
      await expect(service.resolveTurnByIndex('session-123', 99)).rejects.toThrow(RangeError)
    })

    it('includes index and turn count in RangeError message', async () => {
      await expect(service.resolveTurnByIndex('session-123', 99)).rejects.toThrow(
        'Index 99 is out of range (session has 3 assistant turns)'
      )
    })
  })

  describe('multiple sequential calls', () => {
    it('allows multiple analyze calls with different sessionIds', async () => {
      await service.analyze('session-123')
      await service.analyze('session-456')
      expect(domain.analyze).toHaveBeenNthCalledWith(1, 'session-123')
      expect(domain.analyze).toHaveBeenNthCalledWith(2, 'session-456')
    })

    it('allows calling both methods in sequence', async () => {
      await service.analyze('session-123')
      await service.getRewindTurns('session-123')
      expect(domain.analyze).toHaveBeenCalledWith('session-123')
      expect(domain.getRewindTurns).toHaveBeenCalledWith('session-123')
    })
  })
})

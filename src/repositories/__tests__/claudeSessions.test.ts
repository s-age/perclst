import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Dirent } from 'fs'

vi.mock('@src/repositories/parsers/claudeSessionScanner')

import {
  createSessionReadState,
  processSessionReadLine,
  finalizeSessionRead,
  createStatsScanState,
  processStatsScanLine,
  finalizeStatsScan,
  createAssistantTurnState,
  processAssistantTurnLine,
  finalizeAssistantTurns
} from '@src/repositories/parsers/claudeSessionScanner'
import type { TokenTotals } from '@src/repositories/parsers/claudeSessionParser'
import type { AssistantTurnEntry, SessionStats } from '@src/types/analysis'
import type { ClaudeCodeTurn } from '@src/types/analysis'
import type { FsInfra } from '@src/infrastructures/fs'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'

type ClaudeSessionFs = Pick<
  FsInfra,
  'homeDir' | 'fileExists' | 'listDirEntries' | 'isDirectory' | 'readLines'
>

const mockCreateSessionReadState = vi.mocked(createSessionReadState)
const mockProcessSessionReadLine = vi.mocked(processSessionReadLine)
const mockFinalizeSessionRead = vi.mocked(finalizeSessionRead)
const mockCreateStatsScanState = vi.mocked(createStatsScanState)
const mockProcessStatsScanLine = vi.mocked(processStatsScanLine)
const mockFinalizeStatsScan = vi.mocked(finalizeStatsScan)
const mockCreateAssistantTurnState = vi.mocked(createAssistantTurnState)
const mockProcessAssistantTurnLine = vi.mocked(processAssistantTurnLine)
const mockFinalizeAssistantTurns = vi.mocked(finalizeAssistantTurns)

function makeDirEntry(name: string, dir: boolean): { name: string; isDirectory: () => boolean } {
  return { name, isDirectory: () => dir }
}

async function* mockLines(...lines: string[]): AsyncGenerator<string> {
  for (const line of lines) yield line
}

describe('ClaudeSessionRepository', () => {
  let repo: ClaudeSessionRepository
  let mockFs: ClaudeSessionFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      homeDir: vi.fn().mockReturnValue('/mock-home'),
      fileExists: vi.fn(),
      listDirEntries: vi.fn(),
      isDirectory: vi.fn(),
      readLines: vi.fn().mockReturnValue(mockLines())
    } as unknown as ClaudeSessionFs
    repo = new ClaudeSessionRepository(mockFs)
  })

  // ─── resolveProjectDir (long path) ──────────────────────────────────────

  describe('resolveProjectDir (long path via validateSessionAtDir)', () => {
    const longDir = '/' + 'a'.repeat(250)
    const sanitized = longDir.replace(/[^a-zA-Z0-9]/g, '-')
    const prefix = sanitized.slice(0, 200)

    it('when sanitized path exceeds 200 characters, attempts prefix matching with listDirEntries', () => {
      const matchedDirName = `${prefix}-abc123`
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        if (p === `/mock-home/.claude/projects/${matchedDirName}/session-1.jsonl`) return true
        return false
      })
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry(matchedDirName, true)
      ] as unknown as Dirent[])

      expect(() => repo.validateSessionAtDir('session-1', longDir)).not.toThrow()
    })

    it('when no existing directory matches prefix, generates name with hash in sanitizeProjectDir', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        return p.includes('.jsonl')
      })
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('unrelated-dir', true)
      ] as unknown as Dirent[])

      expect(() => repo.validateSessionAtDir('session-1', longDir)).not.toThrow()
    })

    it('when projects directory does not exist, falls back to sanitizeProjectDir', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return false
        return p.includes('.jsonl')
      })

      expect(() => repo.validateSessionAtDir('session-1', longDir)).not.toThrow()
    })
  })

  // ─── findEncodedDirBySessionId ───────────────────────────────────────────

  describe('findEncodedDirBySessionId', () => {
    it('returns the matching encoded directory name when exactly one session is found', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        if (p === '/mock-home/.claude/projects/encoded-dir/session-1.jsonl') return true
        return false
      })
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('encoded-dir', true)
      ] as unknown as Dirent[])

      expect(repo.findEncodedDirBySessionId('session-1')).toBe('encoded-dir')
    })

    it('throws when the Claude Code projects directory does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.findEncodedDirBySessionId('session-1')).toThrow(
        'Claude Code projects directory not found'
      )
    })

    it('throws when no project directory contains a JSONL for the session ID', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (p: string) => p === '/mock-home/.claude/projects'
      )
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('some-dir', true)
      ] as unknown as Dirent[])

      expect(() => repo.findEncodedDirBySessionId('session-1')).toThrow(
        'Claude Code session not found: session-1'
      )
    })

    it('throws when the session ID is found in multiple project directories', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        if (p.endsWith('session-1.jsonl')) return true
        return false
      })
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('dir-a', true),
        makeDirEntry('dir-b', true)
      ] as unknown as Dirent[])

      expect(() => repo.findEncodedDirBySessionId('session-1')).toThrow(
        'multiple project directories'
      )
    })

    it('skips non-directory entries in the projects directory', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (p: string) => p === '/mock-home/.claude/projects'
      )
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('loose-file.json', false)
      ] as unknown as Dirent[])

      expect(() => repo.findEncodedDirBySessionId('session-1')).toThrow(
        'Claude Code session not found: session-1'
      )
    })

    it('skips directory entries that do not contain the session JSONL', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        if (p === '/mock-home/.claude/projects/some-dir/other-session.jsonl') return true
        return false
      })
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        makeDirEntry('some-dir', true)
      ] as unknown as Dirent[])

      expect(() => repo.findEncodedDirBySessionId('session-1')).toThrow(
        'Claude Code session not found: session-1'
      )
    })
  })

  // ─── decodeWorkingDir ───────────────────────────────────────────────────

  describe('decodeWorkingDir', () => {
    it('returns { path: null, ambiguous: false } when encoded does not start with "-"', () => {
      expect(repo.decodeWorkingDir('home-user')).toEqual({ path: null, ambiguous: false })
    })

    it('returns the resolved path when exactly one candidate exists on the filesystem', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (p: string) => p === '/home' || p === '/home/user'
      )
      vi.mocked(mockFs.isDirectory).mockImplementation(
        (p: string) => p === '/home' || p === '/home/user'
      )

      expect(repo.decodeWorkingDir('-home-user')).toEqual({ path: '/home/user', ambiguous: false })
    })

    it('returns { path: null, ambiguous: false } when no candidate path exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(repo.decodeWorkingDir('-nonexistent')).toEqual({ path: null, ambiguous: false })
    })

    it('returns { path: null, ambiguous: true } when multiple candidate paths exist', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (p: string) => p === '/a' || p === '/a/b' || p === '/a-b'
      )
      vi.mocked(mockFs.isDirectory).mockImplementation(
        (p: string) => p === '/a' || p === '/a/b' || p === '/a-b'
      )

      expect(repo.decodeWorkingDir('-a-b')).toEqual({ path: null, ambiguous: true })
    })

    it('does not propagate errors thrown by fileExists (permission errors are swallowed)', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(() => {
        throw new Error('EPERM: permission denied')
      })

      expect(repo.decodeWorkingDir('-any-path')).toEqual({ path: null, ambiguous: false })
    })
  })

  // ─── validateSessionAtDir ───────────────────────────────────────────────

  describe('validateSessionAtDir', () => {
    it('does not throw when the session JSONL file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      expect(() => repo.validateSessionAtDir('session-1', '/work/dir')).not.toThrow()
    })

    it('throws with a path-containing message when the session JSONL file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.validateSessionAtDir('session-1', '/work/dir')).toThrow(
        'Claude Code session not found'
      )
    })
  })

  // ─── readSession ────────────────────────────────────────────────────────

  describe('readSession', () => {
    const emptyTokens: TokenTotals = {
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreation: 0
    }
    const stubState = {} as ReturnType<typeof createSessionReadState>

    beforeEach(() => {
      mockCreateSessionReadState.mockReturnValue(stubState)
      mockProcessSessionReadLine.mockReturnValue(false)
      mockFinalizeSessionRead.mockReturnValue({
        turns: [],
        tokens: emptyTokens,
        contextWindow: 0
      })
    })

    it('throws when the session JSONL file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await expect(repo.readSession('session-1', '/work/dir')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })

    it('passes upToMessageId to createSessionReadState when provided', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      await repo.readSession('session-1', '/work/dir', 'msg-42')

      expect(mockCreateSessionReadState).toHaveBeenCalledWith('msg-42')
    })

    it('passes undefined upToMessageId to createSessionReadState when omitted', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      await repo.readSession('session-1', '/work/dir')

      expect(mockCreateSessionReadState).toHaveBeenCalledWith(undefined)
    })

    it('streams lines through the state machine and returns finalized result', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readLines).mockReturnValue(mockLines('line1', 'line2'))
      const expectedTurns: ClaudeCodeTurn[] = [{ toolCalls: [], assistantText: 'hi' }]
      const expectedTokens: TokenTotals = {
        totalInput: 100,
        totalOutput: 50,
        totalCacheRead: 0,
        totalCacheCreation: 0
      }
      mockFinalizeSessionRead.mockReturnValue({
        turns: expectedTurns,
        tokens: expectedTokens,
        contextWindow: 0
      })

      const result = await repo.readSession('session-1', '/work/dir')

      expect(mockProcessSessionReadLine).toHaveBeenCalledTimes(2)
      expect(mockProcessSessionReadLine).toHaveBeenCalledWith(stubState, 'line1')
      expect(mockProcessSessionReadLine).toHaveBeenCalledWith(stubState, 'line2')
      expect(mockFinalizeSessionRead).toHaveBeenCalledWith(stubState)
      expect(result).toEqual({
        turns: expectedTurns,
        tokens: { ...expectedTokens, contextWindow: 0 }
      })
    })

    it('stops streaming when processSessionReadLine returns true', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readLines).mockReturnValue(mockLines('line1', 'line2', 'line3'))
      mockProcessSessionReadLine.mockReturnValueOnce(false).mockReturnValueOnce(true)

      await repo.readSession('session-1', '/work/dir')

      expect(mockProcessSessionReadLine).toHaveBeenCalledTimes(2)
    })
  })

  // ─── scanSessionStats ───────────────────────────────────────────────────

  describe('scanSessionStats', () => {
    const makeStats = (): SessionStats => ({
      apiCalls: 2,
      toolCalls: 3,
      tokens: {
        totalInput: 100,
        totalOutput: 50,
        totalCacheRead: 0,
        totalCacheCreation: 0,
        contextWindow: 0
      }
    })
    const stubState = {} as ReturnType<typeof createStatsScanState>

    beforeEach(() => {
      mockCreateStatsScanState.mockReturnValue(stubState)
      mockProcessStatsScanLine.mockReturnValue(false)
      mockFinalizeStatsScan.mockReturnValue(makeStats())
    })

    it('throws when the session JSONL file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await expect(repo.scanSessionStats('session-1', '/work/dir')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })

    it('returns the stats produced by finalizeStatsScan', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      const result = await repo.scanSessionStats('session-1', '/work/dir')

      expect(mockCreateStatsScanState).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(makeStats())
    })

    it('passes upToMessageId to createStatsScanState when provided', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      await repo.scanSessionStats('session-1', '/work/dir', 'msg-42')

      expect(mockCreateStatsScanState).toHaveBeenCalledWith('msg-42')
    })

    it('stops streaming when processStatsScanLine returns true', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readLines).mockReturnValue(mockLines('line1', 'line2', 'line3'))
      mockProcessStatsScanLine.mockReturnValueOnce(false).mockReturnValueOnce(true)

      await repo.scanSessionStats('session-1', '/work/dir')

      expect(mockProcessStatsScanLine).toHaveBeenCalledTimes(2)
    })
  })

  // ─── getAssistantTurns ──────────────────────────────────────────────────

  describe('getAssistantTurns', () => {
    const stubState = {} as ReturnType<typeof createAssistantTurnState>

    beforeEach(() => {
      mockCreateAssistantTurnState.mockReturnValue(stubState)
      mockFinalizeAssistantTurns.mockReturnValue([])
    })

    it('throws when the session JSONL file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await expect(repo.getAssistantTurns('session-1', '/work/dir')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })

    it('returns the entries produced by finalizeAssistantTurns', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readLines).mockReturnValue(mockLines('line1'))
      const expected: AssistantTurnEntry[] = [{ uuid: 'a-1', text: 'Hello world' }]
      mockFinalizeAssistantTurns.mockReturnValue(expected)

      const result = await repo.getAssistantTurns('session-1', '/work/dir')

      expect(mockProcessAssistantTurnLine).toHaveBeenCalledWith(stubState, 'line1')
      expect(mockFinalizeAssistantTurns).toHaveBeenCalledWith(stubState)
      expect(result).toEqual(expected)
    })

    it('returns an empty array when finalizeAssistantTurns returns empty', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      expect(await repo.getAssistantTurns('session-1', '/work/dir')).toEqual([])
    })
  })
})

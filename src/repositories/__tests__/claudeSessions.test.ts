import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Dirent } from 'fs'

vi.mock('@src/repositories/parsers/claudeSessionParser')

import {
  parseRawEntries,
  buildToolResultMap,
  buildTurns,
  filterEntriesUpTo
} from '@src/repositories/parsers/claudeSessionParser'
import type { RawEntry, TokenTotals } from '@src/repositories/parsers/claudeSessionParser'
import type { ClaudeCodeTurn } from '@src/types/analysis'
import type { FsInfra } from '@src/infrastructures/fs'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'

type ClaudeSessionFs = Pick<
  FsInfra,
  'homeDir' | 'fileExists' | 'listDirEntries' | 'isDirectory' | 'readText'
>

const mockParseRawEntries = vi.mocked(parseRawEntries)
const mockBuildToolResultMap = vi.mocked(buildToolResultMap)
const mockBuildTurns = vi.mocked(buildTurns)
const mockFilterEntriesUpTo = vi.mocked(filterEntriesUpTo)

type ToolResultMap = Map<string, { text: string | null; isError: boolean }>

function makeDirEntry(name: string, dir: boolean): { name: string; isDirectory: () => boolean } {
  return { name, isDirectory: () => dir }
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
      readText: vi.fn()
    } as unknown as ClaudeSessionFs
    repo = new ClaudeSessionRepository(mockFs)
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

    beforeEach(() => {
      vi.mocked(mockFs.readText).mockReturnValue('raw content')
      mockParseRawEntries.mockReturnValue([])
      mockBuildToolResultMap.mockReturnValue(new Map() as ToolResultMap)
      mockBuildTurns.mockReturnValue({ turns: [], tokens: emptyTokens, contextWindow: 0 })
    })

    it('throws when the session JSONL file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.readSession('session-1', '/work/dir')).toThrow(
        'Claude Code session file not found'
      )
    })

    it('calls filterEntriesUpTo when upToMessageId is provided', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockFilterEntriesUpTo.mockReturnValue([])

      repo.readSession('session-1', '/work/dir', 'msg-42')

      expect(mockFilterEntriesUpTo).toHaveBeenCalledWith(expect.anything(), 'msg-42')
    })

    it('does not call filterEntriesUpTo when upToMessageId is omitted', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      repo.readSession('session-1', '/work/dir')

      expect(mockFilterEntriesUpTo).not.toHaveBeenCalled()
    })

    it('returns the turns and tokens produced by buildTurns', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      const expectedTurns: ClaudeCodeTurn[] = [{ toolCalls: [], assistantText: 'hi' }]
      const expectedTokens: TokenTotals = {
        totalInput: 100,
        totalOutput: 50,
        totalCacheRead: 0,
        totalCacheCreation: 0
      }
      mockBuildTurns.mockReturnValue({
        turns: expectedTurns,
        tokens: expectedTokens,
        contextWindow: 0
      })

      const result = repo.readSession('session-1', '/work/dir')

      expect(result).toEqual({
        turns: expectedTurns,
        tokens: { ...expectedTokens, contextWindow: 0 }
      })
    })
  })

  // ─── getAssistantTurns ──────────────────────────────────────────────────

  describe('getAssistantTurns', () => {
    beforeEach(() => {
      vi.mocked(mockFs.readText).mockReturnValue('raw content')
    })

    it('throws when the session JSONL file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.getAssistantTurns('session-1', '/work/dir')).toThrow(
        'Claude Code session file not found'
      )
    })

    it('returns an empty array when there are no assistant-type entries', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockParseRawEntries.mockReturnValue([
        { type: 'user', message: { content: [{ type: 'text', text: 'hello' }] } }
      ] as unknown as RawEntry[])

      expect(repo.getAssistantTurns('session-1', '/work/dir')).toEqual([])
    })

    it('skips assistant entries whose content consists entirely of thinking blocks', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockParseRawEntries.mockReturnValue([
        {
          type: 'assistant',
          uuid: 'a-1',
          message: { content: [{ type: 'thinking', thinking: 'internal monologue' }] }
        }
      ] as unknown as RawEntry[])

      expect(repo.getAssistantTurns('session-1', '/work/dir')).toEqual([])
    })

    it('skips assistant entries where the joined text is empty after trimming', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockParseRawEntries.mockReturnValue([
        {
          type: 'assistant',
          uuid: 'a-2',
          message: { content: [{ type: 'text', text: '   ' }] }
        }
      ] as unknown as RawEntry[])

      expect(repo.getAssistantTurns('session-1', '/work/dir')).toEqual([])
    })

    it('returns { uuid, trimmed text } for a valid assistant entry', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockParseRawEntries.mockReturnValue([
        {
          type: 'assistant',
          uuid: 'a-3',
          message: { content: [{ type: 'text', text: '  Hello world  ' }] }
        }
      ] as unknown as RawEntry[])

      expect(repo.getAssistantTurns('session-1', '/work/dir')).toEqual([
        { uuid: 'a-3', text: 'Hello world' }
      ])
    })

    it('excludes tool_use blocks from text but retains text blocks in the same entry', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      mockParseRawEntries.mockReturnValue([
        {
          type: 'assistant',
          uuid: 'a-4',
          message: {
            content: [
              { type: 'text', text: 'Here is the result' },
              { type: 'tool_use', id: 'tid-1', name: 'Read', input: {} }
            ]
          }
        }
      ] as unknown as RawEntry[])

      expect(repo.getAssistantTurns('session-1', '/work/dir')).toEqual([
        { uuid: 'a-4', text: 'Here is the result' }
      ])
    })
  })
})

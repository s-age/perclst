import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Dirent } from 'fs'

vi.mock('@src/infrastructures/fs')
vi.mock('@src/repositories/parsers/claudeSessionParser')

import { fileExists, homeDir, readText, listDirEntries, isDirectory } from '@src/infrastructures/fs'
import {
  parseRawEntries,
  buildToolResultMap,
  buildTurns,
  filterEntriesUpTo
} from '@src/repositories/parsers/claudeSessionParser'
import type { RawEntry, TokenTotals } from '@src/repositories/parsers/claudeSessionParser'
import type { ClaudeCodeTurn } from '@src/types/analysis'
import {
  decodeWorkingDir,
  findEncodedDirBySessionId,
  validateSessionAtDir,
  getAssistantTurns,
  readClaudeSession,
  ClaudeSessionRepository
} from '@src/repositories/claudeSessions'

const mockFileExists = vi.mocked(fileExists)
const mockHomeDir = vi.mocked(homeDir)
const mockReadText = vi.mocked(readText)
const mockListDirEntries = vi.mocked(listDirEntries)
const mockIsDirectory = vi.mocked(isDirectory)
const mockParseRawEntries = vi.mocked(parseRawEntries)
const mockBuildToolResultMap = vi.mocked(buildToolResultMap)
const mockBuildTurns = vi.mocked(buildTurns)
const mockFilterEntriesUpTo = vi.mocked(filterEntriesUpTo)

type ToolResultMap = Map<string, { text: string | null; isError: boolean }>

function makeDirEntry(name: string, dir: boolean): { name: string; isDirectory: () => boolean } {
  return { name, isDirectory: () => dir }
}

// ─── decodeWorkingDir ──────────────────────────────────────────────────────────

describe('decodeWorkingDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { path: null, ambiguous: false } when encoded does not start with "-"', () => {
    const result = decodeWorkingDir('home-user')

    expect(result).toEqual({ path: null, ambiguous: false })
  })

  it('returns the resolved path when exactly one candidate exists on the filesystem', () => {
    mockFileExists.mockImplementation((p: string) => p === '/home' || p === '/home/user')
    mockIsDirectory.mockImplementation((p: string) => p === '/home' || p === '/home/user')

    const result = decodeWorkingDir('-home-user')

    expect(result).toEqual({ path: '/home/user', ambiguous: false })
  })

  it('returns { path: null, ambiguous: false } when no candidate path exists', () => {
    mockFileExists.mockReturnValue(false)

    const result = decodeWorkingDir('-nonexistent')

    expect(result).toEqual({ path: null, ambiguous: false })
  })

  it('returns { path: null, ambiguous: true } when multiple candidate paths exist', () => {
    // '-a-b' can decode to '/a/b' (split on '-') or '/a-b' (literal hyphen in name)
    mockFileExists.mockImplementation((p: string) => p === '/a' || p === '/a/b' || p === '/a-b')
    mockIsDirectory.mockImplementation((p: string) => p === '/a' || p === '/a/b' || p === '/a-b')

    const result = decodeWorkingDir('-a-b')

    expect(result).toEqual({ path: null, ambiguous: true })
  })

  it('does not propagate errors thrown by fileExists (permission errors are swallowed)', () => {
    mockFileExists.mockImplementation(() => {
      throw new Error('EPERM: permission denied')
    })

    const result = decodeWorkingDir('-any-path')

    expect(result).toEqual({ path: null, ambiguous: false })
  })
})

// ─── findEncodedDirBySessionId ────────────────────────────────────────────────

describe('findEncodedDirBySessionId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/mock-home')
  })

  it('returns the matching encoded directory name when exactly one session is found', () => {
    mockFileExists.mockImplementation((p: string) => {
      if (p === '/mock-home/.claude/projects') return true
      if (p === '/mock-home/.claude/projects/encoded-dir/session-1.jsonl') return true
      return false
    })
    mockListDirEntries.mockReturnValue([makeDirEntry('encoded-dir', true)] as unknown as Dirent[])

    const result = findEncodedDirBySessionId('session-1')

    expect(result).toBe('encoded-dir')
  })

  it('throws when the Claude Code projects directory does not exist', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => findEncodedDirBySessionId('session-1')).toThrow(
      'Claude Code projects directory not found'
    )
  })

  it('throws when no project directory contains a JSONL for the session ID', () => {
    mockFileExists.mockImplementation((p: string) => p === '/mock-home/.claude/projects')
    mockListDirEntries.mockReturnValue([makeDirEntry('some-dir', true)] as unknown as Dirent[])

    expect(() => findEncodedDirBySessionId('session-1')).toThrow(
      'Claude Code session not found: session-1'
    )
  })

  it('throws when the session ID is found in multiple project directories', () => {
    mockFileExists.mockImplementation((p: string) => {
      if (p === '/mock-home/.claude/projects') return true
      if (p.endsWith('session-1.jsonl')) return true
      return false
    })
    mockListDirEntries.mockReturnValue([
      makeDirEntry('dir-a', true),
      makeDirEntry('dir-b', true)
    ] as unknown as Dirent[])

    expect(() => findEncodedDirBySessionId('session-1')).toThrow('multiple project directories')
  })

  it('skips non-directory entries in the projects directory', () => {
    mockFileExists.mockImplementation((p: string) => p === '/mock-home/.claude/projects')
    mockListDirEntries.mockReturnValue([
      makeDirEntry('loose-file.json', false)
    ] as unknown as Dirent[])

    expect(() => findEncodedDirBySessionId('session-1')).toThrow(
      'Claude Code session not found: session-1'
    )
  })

  it('skips directory entries that do not contain the session JSONL', () => {
    mockFileExists.mockImplementation((p: string) => {
      if (p === '/mock-home/.claude/projects') return true
      if (p === '/mock-home/.claude/projects/some-dir/other-session.jsonl') return true
      return false
    })
    mockListDirEntries.mockReturnValue([makeDirEntry('some-dir', true)] as unknown as Dirent[])

    expect(() => findEncodedDirBySessionId('session-1')).toThrow(
      'Claude Code session not found: session-1'
    )
  })
})

// ─── validateSessionAtDir ─────────────────────────────────────────────────────

describe('validateSessionAtDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/mock-home')
  })

  it('does not throw when the session JSONL file exists', () => {
    mockFileExists.mockReturnValue(true)

    expect(() => validateSessionAtDir('session-1', '/work/dir')).not.toThrow()
  })

  it('throws with a path-containing message when the session JSONL file does not exist', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => validateSessionAtDir('session-1', '/work/dir')).toThrow(
      'Claude Code session not found'
    )
  })
})

// ─── getAssistantTurns ────────────────────────────────────────────────────────

describe('getAssistantTurns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/mock-home')
    mockReadText.mockReturnValue('raw content')
  })

  it('throws when the session JSONL file does not exist', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => getAssistantTurns('session-1', '/work/dir')).toThrow(
      'Claude Code session file not found'
    )
  })

  it('returns an empty array when there are no assistant-type entries', () => {
    mockFileExists.mockReturnValue(true)
    mockParseRawEntries.mockReturnValue([
      { type: 'user', message: { content: [{ type: 'text', text: 'hello' }] } }
    ] as unknown as RawEntry[])

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([])
  })

  it('skips non-assistant entries (e.g. tool_result)', () => {
    mockFileExists.mockReturnValue(true)
    mockParseRawEntries.mockReturnValue([
      { type: 'tool_result', uuid: 't-1', message: { content: [{ type: 'text', text: 'data' }] } }
    ] as unknown as RawEntry[])

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([])
  })

  it('skips assistant entries whose content consists entirely of thinking blocks', () => {
    mockFileExists.mockReturnValue(true)
    mockParseRawEntries.mockReturnValue([
      {
        type: 'assistant',
        uuid: 'a-1',
        message: { content: [{ type: 'thinking', thinking: 'internal monologue' }] }
      }
    ] as unknown as RawEntry[])

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([])
  })

  it('skips assistant entries where the joined text is empty after trimming', () => {
    mockFileExists.mockReturnValue(true)
    mockParseRawEntries.mockReturnValue([
      {
        type: 'assistant',
        uuid: 'a-2',
        message: { content: [{ type: 'text', text: '   ' }] }
      }
    ] as unknown as RawEntry[])

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([])
  })

  it('returns { uuid, trimmed text } for a valid assistant entry', () => {
    mockFileExists.mockReturnValue(true)
    mockParseRawEntries.mockReturnValue([
      {
        type: 'assistant',
        uuid: 'a-3',
        message: { content: [{ type: 'text', text: '  Hello world  ' }] }
      }
    ] as unknown as RawEntry[])

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([{ uuid: 'a-3', text: 'Hello world' }])
  })

  it('excludes tool_use blocks from text but retains text blocks in the same entry', () => {
    mockFileExists.mockReturnValue(true)
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

    const result = getAssistantTurns('session-1', '/work/dir')

    expect(result).toEqual([{ uuid: 'a-4', text: 'Here is the result' }])
  })
})

// ─── readClaudeSession ────────────────────────────────────────────────────────

describe('readClaudeSession', () => {
  const emptyTokens: TokenTotals = {
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalCacheCreation: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/mock-home')
    mockReadText.mockReturnValue('raw content')
    mockParseRawEntries.mockReturnValue([])
    mockBuildToolResultMap.mockReturnValue(new Map() as ToolResultMap)
    mockBuildTurns.mockReturnValue({ turns: [], tokens: emptyTokens })
  })

  it('throws when the session JSONL file does not exist', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => readClaudeSession('session-1', '/work/dir')).toThrow(
      'Claude Code session file not found'
    )
  })

  it('calls filterEntriesUpTo when upToMessageId is provided', () => {
    mockFileExists.mockReturnValue(true)
    mockFilterEntriesUpTo.mockReturnValue([])

    readClaudeSession('session-1', '/work/dir', 'msg-42')

    expect(mockFilterEntriesUpTo).toHaveBeenCalledWith(expect.anything(), 'msg-42')
  })

  it('does not call filterEntriesUpTo when upToMessageId is omitted', () => {
    mockFileExists.mockReturnValue(true)

    readClaudeSession('session-1', '/work/dir')

    expect(mockFilterEntriesUpTo).not.toHaveBeenCalled()
  })

  it('returns the turns and tokens produced by buildTurns', () => {
    mockFileExists.mockReturnValue(true)
    const expectedTurns: ClaudeCodeTurn[] = [{ toolCalls: [], assistantText: 'hi' }]
    const expectedTokens: TokenTotals = {
      totalInput: 100,
      totalOutput: 50,
      totalCacheRead: 0,
      totalCacheCreation: 0
    }
    mockBuildTurns.mockReturnValue({ turns: expectedTurns, tokens: expectedTokens })

    const result = readClaudeSession('session-1', '/work/dir')

    expect(result).toEqual({ turns: expectedTurns, tokens: expectedTokens })
  })
})

// ─── ClaudeSessionRepository ──────────────────────────────────────────────────

describe('ClaudeSessionRepository', () => {
  let repo: ClaudeSessionRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/mock-home')
    repo = new ClaudeSessionRepository()
  })

  describe('findEncodedDirBySessionId', () => {
    it('delegates to the module-level function and returns the encoded dir name', () => {
      mockFileExists.mockImplementation((p: string) => {
        if (p === '/mock-home/.claude/projects') return true
        if (p === '/mock-home/.claude/projects/encoded-dir/session-1.jsonl') return true
        return false
      })
      mockListDirEntries.mockReturnValue([makeDirEntry('encoded-dir', true)] as unknown as Dirent[])

      const result = repo.findEncodedDirBySessionId('session-1')

      expect(result).toBe('encoded-dir')
    })
  })

  describe('decodeWorkingDir', () => {
    it('returns { path: null, ambiguous: false } when no valid path found', () => {
      mockFileExists.mockReturnValue(false)

      const result = repo.decodeWorkingDir('-nonexistent-path')

      expect(result).toEqual({ path: null, ambiguous: false })
    })
  })

  describe('validateSessionAtDir', () => {
    it('does not throw when the session JSONL exists', () => {
      mockFileExists.mockReturnValue(true)

      expect(() => repo.validateSessionAtDir('session-1', '/work/dir')).not.toThrow()
    })
  })

  describe('readSession', () => {
    it('delegates to readClaudeSession and returns the resulting turns and tokens', () => {
      const emptyTokens: TokenTotals = {
        totalInput: 10,
        totalOutput: 5,
        totalCacheRead: 0,
        totalCacheCreation: 0
      }
      mockFileExists.mockReturnValue(true)
      mockReadText.mockReturnValue('raw')
      mockParseRawEntries.mockReturnValue([])
      mockBuildToolResultMap.mockReturnValue(new Map() as ToolResultMap)
      mockBuildTurns.mockReturnValue({ turns: [], tokens: emptyTokens })

      const result = repo.readSession('session-1', '/work/dir')

      expect(result).toEqual({ turns: [], tokens: emptyTokens })
    })
  })

  describe('getAssistantTurns', () => {
    it('delegates to the module-level function and returns assistant turn entries', () => {
      mockFileExists.mockReturnValue(true)
      mockReadText.mockReturnValue('raw')
      mockParseRawEntries.mockReturnValue([
        {
          type: 'assistant',
          uuid: 'a-1',
          message: { content: [{ type: 'text', text: 'Result here' }] }
        }
      ] as unknown as RawEntry[])

      const result = repo.getAssistantTurns('session-1', '/work/dir')

      expect(result).toEqual([{ uuid: 'a-1', text: 'Result here' }])
    })
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'
import type { Session } from '@src/types/session'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'
import {
  getSessionPath,
  saveSession,
  loadSession,
  existsSession,
  deleteSession,
  findSessionByName,
  listSessions,
  SessionRepository
} from '@src/repositories/sessions'
import {
  readJson,
  writeJson,
  fileExists,
  removeFile,
  listFiles,
  ensureDir
} from '@src/infrastructures/fs'

vi.mock('@src/infrastructures/fs', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
  fileExists: vi.fn(),
  removeFile: vi.fn(),
  listFiles: vi.fn(),
  ensureDir: vi.fn()
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSIONS_DIR = '/home/user/.perclst/sessions'

const makeSession = (overrides?: Partial<Session>): Session => ({
  id: 'session-1',
  name: 'my-session',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  claude_session_id: 'claude-abc',
  working_dir: '/tmp',
  metadata: { tags: [], status: 'active' },
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getSessionPath
// ---------------------------------------------------------------------------

describe('getSessionPath', () => {
  it('returns the joined path with .json extension', () => {
    const result = getSessionPath(SESSIONS_DIR, 'abc-123')
    expect(result).toBe(join(SESSIONS_DIR, 'abc-123.json'))
  })
})

// ---------------------------------------------------------------------------
// saveSession
// ---------------------------------------------------------------------------

describe('saveSession', () => {
  it('calls ensureDir with sessionsDir', () => {
    saveSession(SESSIONS_DIR, makeSession())
    expect(ensureDir).toHaveBeenCalledWith(SESSIONS_DIR)
  })

  it('calls writeJson with the resolved path and session data', () => {
    const session = makeSession()
    saveSession(SESSIONS_DIR, session)
    expect(writeJson).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'), session)
  })
})

// ---------------------------------------------------------------------------
// loadSession
// ---------------------------------------------------------------------------

describe('loadSession', () => {
  it('returns the parsed session when the file exists', () => {
    const session = makeSession()
    vi.mocked(fileExists).mockReturnValue(true)
    vi.mocked(readJson).mockReturnValue(session)

    const result = loadSession(SESSIONS_DIR, 'session-1')

    expect(result).toEqual(session)
  })

  it('throws SessionNotFoundError when the file does not exist', () => {
    vi.mocked(fileExists).mockReturnValue(false)

    expect(() => loadSession(SESSIONS_DIR, 'missing-id')).toThrow(SessionNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// existsSession
// ---------------------------------------------------------------------------

describe('existsSession', () => {
  it('returns true when the session file exists', () => {
    vi.mocked(fileExists).mockReturnValue(true)

    expect(existsSession(SESSIONS_DIR, 'session-1')).toBe(true)
  })

  it('returns false when the session file does not exist', () => {
    vi.mocked(fileExists).mockReturnValue(false)

    expect(existsSession(SESSIONS_DIR, 'session-1')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------

describe('deleteSession', () => {
  it('calls removeFile with the session path when the file exists', async () => {
    vi.mocked(fileExists).mockReturnValue(true)
    vi.mocked(removeFile).mockResolvedValue(undefined)

    await deleteSession(SESSIONS_DIR, 'session-1')

    expect(removeFile).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'))
  })

  it('throws SessionNotFoundError when the file does not exist', async () => {
    vi.mocked(fileExists).mockReturnValue(false)

    await expect(deleteSession(SESSIONS_DIR, 'missing-id')).rejects.toThrow(SessionNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// findSessionByName
// ---------------------------------------------------------------------------

describe('findSessionByName', () => {
  it('returns the session that matches the given name', () => {
    const session = makeSession({ id: 'session-1', name: 'target' })
    vi.mocked(listFiles).mockReturnValue(['session-1.json'])
    vi.mocked(fileExists).mockReturnValue(true)
    vi.mocked(readJson).mockReturnValue(session)

    const result = findSessionByName(SESSIONS_DIR, 'target')

    expect(result).toEqual(session)
  })

  it('returns null when no session matches the name', () => {
    const session = makeSession({ id: 'session-1', name: 'other' })
    vi.mocked(listFiles).mockReturnValue(['session-1.json'])
    vi.mocked(fileExists).mockReturnValue(true)
    vi.mocked(readJson).mockReturnValue(session)

    const result = findSessionByName(SESSIONS_DIR, 'target')

    expect(result).toBeNull()
  })

  it('returns null when the sessions list is empty', () => {
    vi.mocked(listFiles).mockReturnValue([])

    const result = findSessionByName(SESSIONS_DIR, 'any-name')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// listSessions
// ---------------------------------------------------------------------------

describe('listSessions', () => {
  it('returns an empty array when no files are present', () => {
    vi.mocked(listFiles).mockReturnValue([])

    const result = listSessions(SESSIONS_DIR)

    expect(result).toEqual([])
  })

  it('returns a loaded session for each json file in the directory', () => {
    const session1 = makeSession({ id: 'session-1' })
    const session2 = makeSession({ id: 'session-2' })
    vi.mocked(listFiles).mockReturnValue(['session-1.json', 'session-2.json'])
    vi.mocked(fileExists).mockReturnValue(true)
    vi.mocked(readJson).mockReturnValueOnce(session1).mockReturnValueOnce(session2)

    const result = listSessions(SESSIONS_DIR)

    expect(result).toEqual([session1, session2])
  })

  it('skips files that fail to load and returns the rest', () => {
    const session1 = makeSession({ id: 'session-1' })
    vi.mocked(listFiles).mockReturnValue(['session-1.json', 'bad.json'])
    // session-1 loads fine; bad.json triggers fileExists → false → SessionNotFoundError → caught
    vi.mocked(fileExists).mockReturnValueOnce(true).mockReturnValueOnce(false)
    vi.mocked(readJson).mockReturnValueOnce(session1)

    const result = listSessions(SESSIONS_DIR)

    expect(result).toEqual([session1])
  })
})

// ---------------------------------------------------------------------------
// SessionRepository
// ---------------------------------------------------------------------------

describe('SessionRepository', () => {
  let repo: SessionRepository

  beforeEach(() => {
    repo = new SessionRepository(SESSIONS_DIR)
  })

  describe('save', () => {
    it('calls ensureDir with sessionsDir', () => {
      repo.save(makeSession())
      expect(ensureDir).toHaveBeenCalledWith(SESSIONS_DIR)
    })

    it('calls writeJson with the resolved path and session', () => {
      const session = makeSession()
      repo.save(session)
      expect(writeJson).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'), session)
    })
  })

  describe('load', () => {
    it('returns the session for the given id', () => {
      const session = makeSession()
      vi.mocked(fileExists).mockReturnValue(true)
      vi.mocked(readJson).mockReturnValue(session)

      expect(repo.load('session-1')).toEqual(session)
    })
  })

  describe('exists', () => {
    it('returns true when the session file exists', () => {
      vi.mocked(fileExists).mockReturnValue(true)

      expect(repo.exists('session-1')).toBe(true)
    })

    it('returns false when the session file does not exist', () => {
      vi.mocked(fileExists).mockReturnValue(false)

      expect(repo.exists('session-1')).toBe(false)
    })
  })

  describe('delete', () => {
    it('resolves after calling removeFile for the session', async () => {
      vi.mocked(fileExists).mockReturnValue(true)
      vi.mocked(removeFile).mockResolvedValue(undefined)

      await repo.delete('session-1')

      expect(removeFile).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'))
    })
  })

  describe('list', () => {
    it('returns all loadable sessions in the directory', () => {
      const session = makeSession()
      vi.mocked(listFiles).mockReturnValue(['session-1.json'])
      vi.mocked(fileExists).mockReturnValue(true)
      vi.mocked(readJson).mockReturnValue(session)

      expect(repo.list()).toEqual([session])
    })
  })

  describe('getPath', () => {
    it('returns the session file path for the given id', () => {
      expect(repo.getPath('session-1')).toBe(join(SESSIONS_DIR, 'session-1.json'))
    })
  })

  describe('findByName', () => {
    it('returns the session that matches the given name', () => {
      const session = makeSession({ name: 'search-target' })
      vi.mocked(listFiles).mockReturnValue(['session-1.json'])
      vi.mocked(fileExists).mockReturnValue(true)
      vi.mocked(readJson).mockReturnValue(session)

      expect(repo.findByName('search-target')).toEqual(session)
    })

    it('returns null when no session matches the given name', () => {
      vi.mocked(listFiles).mockReturnValue([])

      expect(repo.findByName('ghost')).toBeNull()
    })
  })
})

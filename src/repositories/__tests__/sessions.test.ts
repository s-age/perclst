import { vi, describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'
import type { Session } from '@src/types/session'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'
import { SessionRepository } from '@src/repositories/sessions'
import type { FsInfra } from '@src/infrastructures/fs'

type SessionFs = Pick<
  FsInfra,
  'ensureDir' | 'writeJson' | 'fileExists' | 'readJson' | 'removeFile' | 'listFiles'
>

const SESSIONS_DIR = '/home/user/.perclst/sessions'

const makeSession = (overrides?: Partial<Session>): Session => ({
  id: 'session-1',
  name: 'my-session',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  claude_session_id: 'claude-abc',
  working_dir: '/tmp',
  metadata: { labels: [], status: 'active' },
  ...overrides
})

describe('SessionRepository', () => {
  let repo: SessionRepository
  let mockFs: SessionFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      readJson: vi.fn(),
      writeJson: vi.fn(),
      fileExists: vi.fn(),
      removeFile: vi.fn(),
      listFiles: vi.fn(),
      ensureDir: vi.fn()
    } as unknown as SessionFs
    repo = new SessionRepository(mockFs, SESSIONS_DIR)
  })

  describe('save', () => {
    it('calls ensureDir with sessionsDir', () => {
      repo.save(makeSession())
      expect(mockFs.ensureDir).toHaveBeenCalledWith(SESSIONS_DIR)
    })

    it('calls writeJson with the resolved path and session data', () => {
      const session = makeSession()
      repo.save(session)
      expect(mockFs.writeJson).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'), session)
    })
  })

  describe('load', () => {
    it('returns the parsed session when the file exists', () => {
      const session = makeSession()
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValue(session)

      const result = repo.load('session-1')

      expect(result).toEqual(session)
    })

    it('throws SessionNotFoundError when the file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.load('missing-id')).toThrow(SessionNotFoundError)
    })
  })

  describe('exists', () => {
    it('returns true when the session file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      expect(repo.exists('session-1')).toBe(true)
    })

    it('returns false when the session file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(repo.exists('session-1')).toBe(false)
    })
  })

  describe('delete', () => {
    it('calls removeFile with the session path when the file exists', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.removeFile).mockResolvedValue(undefined)

      await repo.delete('session-1')

      expect(mockFs.removeFile).toHaveBeenCalledWith(join(SESSIONS_DIR, 'session-1.json'))
    })

    it('throws SessionNotFoundError when the file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await expect(repo.delete('missing-id')).rejects.toThrow(SessionNotFoundError)
    })
  })

  describe('list', () => {
    it('returns an empty array when no files are present', () => {
      vi.mocked(mockFs.listFiles).mockReturnValue([])

      expect(repo.list()).toEqual([])
    })

    it('returns a loaded session for each json file in the directory', () => {
      const session1 = makeSession({ id: 'session-1' })
      const session2 = makeSession({ id: 'session-2' })
      vi.mocked(mockFs.listFiles).mockReturnValue(['session-1.json', 'session-2.json'])
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValueOnce(session1).mockReturnValueOnce(session2)

      expect(repo.list()).toEqual([session1, session2])
    })

    it('skips files that fail to load and returns the rest', () => {
      const session1 = makeSession({ id: 'session-1' })
      vi.mocked(mockFs.listFiles).mockReturnValue(['session-1.json', 'bad.json'])
      vi.mocked(mockFs.fileExists).mockReturnValueOnce(true).mockReturnValueOnce(false)
      vi.mocked(mockFs.readJson).mockReturnValueOnce(session1)

      expect(repo.list()).toEqual([session1])
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
      vi.mocked(mockFs.listFiles).mockReturnValue(['session-1.json'])
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValue(session)

      expect(repo.findByName('search-target')).toEqual(session)
    })

    it('returns null when no session matches the given name', () => {
      vi.mocked(mockFs.listFiles).mockReturnValue([])

      expect(repo.findByName('ghost')).toBeNull()
    })
  })
})

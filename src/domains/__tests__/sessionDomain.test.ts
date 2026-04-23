import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ISessionRepository } from '@src/repositories/ports/session'
import { SessionDomain } from '../session'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'

const mockSessionRepo: ISessionRepository = {
  save: vi.fn(),
  load: vi.fn(),
  exists: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  getPath: vi.fn(),
  findByName: vi.fn()
}

describe('SessionDomain', () => {
  let domain: SessionDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionDomain(mockSessionRepo)
  })

  it('should create a new session', async () => {
    const session = await domain.create({
      procedure: 'test-procedure',
      labels: ['tag1', 'tag2'],
      working_dir: '/tmp/test'
    })

    expect(session.id).toBeDefined()
    expect(session.procedure).toBe('test-procedure')
    expect(session.metadata.labels).toContain('tag1')
    expect(session.metadata.status).toBe('active')
    expect(mockSessionRepo.save).toHaveBeenCalledWith(session)
  })

  it('should delegate get to sessionRepo.load', async () => {
    const mockSession = { id: 'abc', procedure: 'p1' } as never
    vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession)

    const result = await domain.get('abc')

    expect(mockSessionRepo.load).toHaveBeenCalledWith('abc')
    expect(result).toBe(mockSession)
  })

  it('should delegate list to sessionRepo.list', async () => {
    const mockSessions = [
      {
        id: 's1',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { status: 'active', labels: [] }
      },
      {
        id: 's2',
        updated_at: '2024-01-02T00:00:00.000Z',
        metadata: { status: 'active', labels: [] }
      }
    ] as never[]
    vi.mocked(mockSessionRepo.list).mockReturnValue(mockSessions)

    const result = await domain.list()

    expect(mockSessionRepo.list).toHaveBeenCalled()
    expect(result).toHaveLength(2)
  })

  it('should sort list results newest-first by updated_at', async () => {
    const older = {
      id: 's1',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    }
    const newer = {
      id: 's2',
      updated_at: '2024-01-02T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    }
    vi.mocked(mockSessionRepo.list).mockReturnValue([older, newer] as never[])

    const result = await domain.list()

    expect(result[0]).toEqual(newer)
    expect(result[1]).toEqual(older)
  })

  it('should filter out sessions missing id', async () => {
    const valid = {
      id: 's1',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    }
    const invalid = {
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    }
    vi.mocked(mockSessionRepo.list).mockReturnValue([valid, invalid] as never[])

    const result = await domain.list()

    expect(result).toEqual([valid])
  })

  it('should filter out sessions missing metadata', async () => {
    const valid = {
      id: 's1',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    }
    const invalid = { id: 's2', updated_at: '2024-01-01T00:00:00.000Z' }
    vi.mocked(mockSessionRepo.list).mockReturnValue([valid, invalid] as never[])

    const result = await domain.list()

    expect(result).toEqual([valid])
  })

  it('should delete a session', async () => {
    vi.mocked(mockSessionRepo.delete).mockResolvedValue(undefined)

    await domain.delete('abc')

    expect(mockSessionRepo.delete).toHaveBeenCalledWith('abc')
  })

  it('should propagate SessionNotFoundError on delete', async () => {
    vi.mocked(mockSessionRepo.delete).mockRejectedValue(new SessionNotFoundError('abc'))

    await expect(domain.delete('abc')).rejects.toThrow(SessionNotFoundError)
  })

  it('should update session status', async () => {
    const mockSession = {
      id: 'abc',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', labels: [] }
    } as never
    vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession)

    const updated = await domain.updateStatus('abc', 'completed')

    expect(updated.metadata.status).toBe('completed')
    expect(mockSessionRepo.save).toHaveBeenCalledWith(updated)
  })

  it('should delegate getPath to sessionRepo.getPath', () => {
    vi.mocked(mockSessionRepo.getPath).mockReturnValue('/tmp/sessions/abc.json')

    const result = domain.getPath('abc')

    expect(mockSessionRepo.getPath).toHaveBeenCalledWith('abc')
    expect(result).toBe('/tmp/sessions/abc.json')
  })

  it('should delegate save to sessionRepo.save', async () => {
    const session = {
      id: 'abc',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      claude_session_id: 'claude-abc',
      working_dir: '/tmp',
      metadata: { status: 'active' as const, labels: [] }
    }

    await domain.save(session)

    expect(mockSessionRepo.save).toHaveBeenCalledWith(session)
  })

  it('should create a session with an explicit name when provided', async () => {
    const session = await domain.create({
      name: 'my-named-session',
      working_dir: '/tmp/test'
    })

    expect(session.name).toBe('my-named-session')
  })

  describe('normalize (via get)', () => {
    it('should migrate legacy tags to labels when labels field is absent', async () => {
      const legacySession = {
        id: 'abc',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        claude_session_id: 'claude-abc',
        working_dir: '/tmp',
        metadata: { status: 'active', tags: ['t1', 't2'] }
      }
      vi.mocked(mockSessionRepo.load).mockReturnValue(legacySession as never)

      const result = await domain.get('abc')

      expect(result.metadata.labels).toEqual(['t1', 't2'])
    })
  })

  describe('list with filters', () => {
    it('should filter sessions by label', async () => {
      const sessions = [
        {
          id: 's1',
          updated_at: '2024-01-01T00:00:00.000Z',
          metadata: { status: 'active' as const, labels: ['frontend'] }
        },
        {
          id: 's2',
          updated_at: '2024-01-01T00:00:00.000Z',
          metadata: { status: 'active' as const, labels: ['backend'] }
        }
      ]
      vi.mocked(mockSessionRepo.list).mockReturnValue(sessions as never[])

      const result = await domain.list({ label: 'frontend' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('s1')
    })

    it('should filter sessions by name substring', async () => {
      const sessions = [
        {
          id: 's1',
          name: 'my-task',
          updated_at: '2024-01-01T00:00:00.000Z',
          metadata: { status: 'active' as const, labels: [] }
        },
        {
          id: 's2',
          name: 'other-work',
          updated_at: '2024-01-01T00:00:00.000Z',
          metadata: { status: 'active' as const, labels: [] }
        }
      ]
      vi.mocked(mockSessionRepo.list).mockReturnValue(sessions as never[])

      const result = await domain.list({ like: 'task' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('s1')
    })
  })

  describe('rename', () => {
    it('should update the session name and save', async () => {
      const mockSession = {
        id: 'abc',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { status: 'active' as const, labels: [] }
      }
      vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession as never)

      const result = await domain.rename('abc', 'new-name')

      expect(result.name).toBe('new-name')
      expect(mockSessionRepo.save).toHaveBeenCalledWith(result)
    })
  })

  describe('setLabels', () => {
    it('should replace all labels and save', async () => {
      const mockSession = {
        id: 'abc',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { status: 'active' as const, labels: ['old'] }
      }
      vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession as never)

      const result = await domain.setLabels('abc', ['new1', 'new2'])

      expect(result.metadata.labels).toEqual(['new1', 'new2'])
      expect(mockSessionRepo.save).toHaveBeenCalledWith(result)
    })
  })

  describe('addLabels', () => {
    it('should merge new labels into existing ones', async () => {
      const mockSession = {
        id: 'abc',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { status: 'active' as const, labels: ['existing'] }
      }
      vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession as never)

      const result = await domain.addLabels('abc', ['new1'])

      expect(result.metadata.labels).toContain('existing')
      expect(result.metadata.labels).toContain('new1')
    })

    it('should not duplicate a label that already exists', async () => {
      const mockSession = {
        id: 'abc',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { status: 'active' as const, labels: ['dup'] }
      }
      vi.mocked(mockSessionRepo.load).mockReturnValue(mockSession as never)

      const result = await domain.addLabels('abc', ['dup', 'new'])

      expect(result.metadata.labels.filter((l: string) => l === 'dup')).toHaveLength(1)
    })
  })

  describe('findByName', () => {
    it('should return the matching session when found', async () => {
      const found = { id: 'found-id', metadata: { status: 'active' as const, labels: [] } }
      vi.mocked(mockSessionRepo.findByName).mockReturnValue(found as never)

      const result = await domain.findByName('my-session')

      expect(result).toBe(found)
    })

    it('should return null when no session matches the name', async () => {
      vi.mocked(mockSessionRepo.findByName).mockReturnValue(null)

      const result = await domain.findByName('missing')

      expect(result).toBeNull()
    })
  })

  describe('resolveId', () => {
    it('should return the input directly when a session with that ID exists', async () => {
      vi.mocked(mockSessionRepo.load).mockReturnValue({
        id: 'known-id',
        metadata: { status: 'active' as const, labels: [] }
      } as never)

      const result = await domain.resolveId('known-id')

      expect(result).toBe('known-id')
    })

    it('should resolve by name when direct ID lookup throws SessionNotFoundError', async () => {
      vi.mocked(mockSessionRepo.load).mockImplementation(() => {
        throw new SessionNotFoundError('not-an-id')
      })
      vi.mocked(mockSessionRepo.findByName).mockReturnValue({
        id: 'resolved-id',
        metadata: { status: 'active' as const, labels: [] }
      } as never)

      const result = await domain.resolveId('my-session-name')

      expect(result).toBe('resolved-id')
    })

    it('should throw SessionNotFoundError when neither ID nor name resolves', async () => {
      vi.mocked(mockSessionRepo.load).mockImplementation(() => {
        throw new SessionNotFoundError('x')
      })
      vi.mocked(mockSessionRepo.findByName).mockReturnValue(null)

      await expect(domain.resolveId('unknown')).rejects.toThrow(SessionNotFoundError)
    })

    it('should rethrow errors that are not SessionNotFoundError', async () => {
      vi.mocked(mockSessionRepo.load).mockImplementation(() => {
        throw new Error('filesystem error')
      })

      await expect(domain.resolveId('any')).rejects.toThrow('filesystem error')
    })
  })

  describe('createRewind', () => {
    const originalMockSession = {
      id: 'original-id',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      claude_session_id: 'claude-original',
      working_dir: '/tmp/orig',
      metadata: { status: 'active' as const, labels: [] }
    }

    beforeEach(() => {
      vi.mocked(mockSessionRepo.load).mockReturnValue(originalMockSession as never)
    })

    it('should create a rewind session pointing to the original claude session', async () => {
      const result = await domain.createRewind('original-id', undefined)

      expect(result.rewind_source_claude_session_id).toBe('claude-original')
      expect(result.rewind_to_message_id).toBeUndefined()
      expect(result.metadata.parent_session_id).toBe('original-id')
      expect(mockSessionRepo.save).toHaveBeenCalledWith(result)
    })

    it('should set rewind_to_message_id when a messageId is provided', async () => {
      const result = await domain.createRewind('original-id', 'msg-42')

      expect(result.rewind_to_message_id).toBe('msg-42')
    })

    it('should set session name when a name is provided', async () => {
      const result = await domain.createRewind('original-id', undefined, 'my-rewind')

      expect(result.name).toBe('my-rewind')
    })
  })

  describe('sweep', () => {
    const makeRaw = (
      id: string,
      created_at: string,
      overrides: Record<string, unknown> = {}
    ): Record<string, unknown> => ({
      id,
      created_at,
      updated_at: created_at,
      claude_session_id: `claude-${id}`,
      working_dir: '/tmp',
      metadata: { status: 'active' as const, labels: [] },
      ...overrides
    })

    it('should return matching sessions without deleting when dryRun is true', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('s1', '2024-06-15T12:00:00.000Z')
      ] as never[])

      const result = await domain.sweep({}, true)

      expect(result).toHaveLength(1)
      expect(mockSessionRepo.delete).not.toHaveBeenCalled()
    })

    it('should delete matching sessions when dryRun is false', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('s1', '2024-06-15T12:00:00.000Z')
      ] as never[])
      vi.mocked(mockSessionRepo.delete).mockResolvedValue(undefined)

      await domain.sweep({}, false)

      expect(mockSessionRepo.delete).toHaveBeenCalledWith('s1')
    })

    it('should exclude sessions created before the from date', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('before', '2024-01-09T00:00:00.000Z'),
        makeRaw('after', '2024-01-11T00:00:00.000Z')
      ] as never[])

      const result = await domain.sweep({ from: '2024-01-10' }, true)

      expect(result.map((s) => s.id)).toEqual(['after'])
    })

    it('should exclude sessions created after the to date', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('before', '2024-01-09T00:00:00.000Z'),
        makeRaw('after', '2024-01-11T00:00:00.000Z')
      ] as never[])

      const result = await domain.sweep({ to: '2024-01-10' }, true)

      expect(result.map((s) => s.id)).toEqual(['before'])
    })

    it('should filter by session status', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('active-s', '2024-06-15T12:00:00.000Z'),
        makeRaw('completed-s', '2024-06-15T12:00:00.000Z', {
          metadata: { status: 'completed', labels: [] }
        })
      ] as never[])

      const result = await domain.sweep({ status: 'completed' }, true)

      expect(result.map((s) => s.id)).toEqual(['completed-s'])
    })

    it('should filter by session name substring', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('match-s', '2024-06-15T12:00:00.000Z', { name: 'my-task' }),
        makeRaw('no-match', '2024-06-15T12:00:00.000Z', { name: 'other' })
      ] as never[])

      const result = await domain.sweep({ like: 'task' }, true)

      expect(result.map((s) => s.id)).toEqual(['match-s'])
    })

    it('should exclude named sessions when anonOnly is true', async () => {
      vi.mocked(mockSessionRepo.list).mockReturnValue([
        makeRaw('named-s', '2024-06-15T12:00:00.000Z', { name: 'has-name' }),
        makeRaw('anon-s', '2024-06-15T12:00:00.000Z')
      ] as never[])

      const result = await domain.sweep({ anonOnly: true }, true)

      expect(result.map((s) => s.id)).toEqual(['anon-s'])
    })
  })
})

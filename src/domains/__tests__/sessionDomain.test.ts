import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@src/repositories/sessions', () => ({
  saveSession: vi.fn(),
  loadSession: vi.fn(),
  existsSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessions: vi.fn(),
  getSessionPath: vi.fn()
}))

import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  getSessionPath
} from '@src/repositories/sessions'
import { SessionDomain } from '../session'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'

const SESSIONS_DIR = '/tmp/sessions'

describe('SessionDomain', () => {
  let domain: SessionDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionDomain(SESSIONS_DIR)
  })

  it('should create a new session', async () => {
    const session = await domain.create({
      procedure: 'test-procedure',
      tags: ['tag1', 'tag2']
    })

    expect(session.id).toBeDefined()
    expect(session.procedure).toBe('test-procedure')
    expect(session.metadata.tags).toContain('tag1')
    expect(session.metadata.status).toBe('active')
    expect(saveSession).toHaveBeenCalledWith(SESSIONS_DIR, session)
  })

  it('should delegate get to loadSession', async () => {
    const mockSession = { id: 'abc', procedure: 'p1' } as never
    vi.mocked(loadSession).mockReturnValue(mockSession)

    const result = await domain.get('abc')

    expect(loadSession).toHaveBeenCalledWith(SESSIONS_DIR, 'abc')
    expect(result).toBe(mockSession)
  })

  it('should delegate list to listSessions', async () => {
    const mockSessions = [{ id: 's1' }, { id: 's2' }] as never[]
    vi.mocked(listSessions).mockReturnValue(mockSessions)

    const result = await domain.list()

    expect(listSessions).toHaveBeenCalledWith(SESSIONS_DIR)
    expect(result).toBe(mockSessions)
  })

  it('should delete a session', async () => {
    vi.mocked(deleteSession).mockResolvedValue(undefined)

    await domain.delete('abc')

    expect(deleteSession).toHaveBeenCalledWith(SESSIONS_DIR, 'abc')
  })

  it('should propagate SessionNotFoundError on delete', async () => {
    vi.mocked(deleteSession).mockRejectedValue(new SessionNotFoundError('abc'))

    await expect(domain.delete('abc')).rejects.toThrow(SessionNotFoundError)
  })

  it('should update session status', async () => {
    const mockSession = {
      id: 'abc',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', tags: [] }
    } as never
    vi.mocked(loadSession).mockReturnValue(mockSession)

    const updated = await domain.updateStatus('abc', 'completed')

    expect(updated.metadata.status).toBe('completed')
    expect(saveSession).toHaveBeenCalledWith(SESSIONS_DIR, updated)
  })

  it('should delegate getPath to getSessionPath', () => {
    vi.mocked(getSessionPath).mockReturnValue('/tmp/sessions/abc.json')

    const result = domain.getPath('abc')

    expect(getSessionPath).toHaveBeenCalledWith(SESSIONS_DIR, 'abc')
    expect(result).toBe('/tmp/sessions/abc.json')
  })
})

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
  getPath: vi.fn()
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
      tags: ['tag1', 'tag2']
    })

    expect(session.id).toBeDefined()
    expect(session.procedure).toBe('test-procedure')
    expect(session.metadata.tags).toContain('tag1')
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
        metadata: { status: 'active', tags: [] }
      },
      { id: 's2', updated_at: '2024-01-02T00:00:00.000Z', metadata: { status: 'active', tags: [] } }
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
      metadata: { status: 'active', tags: [] }
    }
    const newer = {
      id: 's2',
      updated_at: '2024-01-02T00:00:00.000Z',
      metadata: { status: 'active', tags: [] }
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
      metadata: { status: 'active', tags: [] }
    }
    const invalid = {
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', tags: [] }
    }
    vi.mocked(mockSessionRepo.list).mockReturnValue([valid, invalid] as never[])

    const result = await domain.list()

    expect(result).toEqual([valid])
  })

  it('should filter out sessions missing metadata', async () => {
    const valid = {
      id: 's1',
      updated_at: '2024-01-01T00:00:00.000Z',
      metadata: { status: 'active', tags: [] }
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
      metadata: { status: 'active', tags: [] }
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
})

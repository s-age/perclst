import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionService } from '../sessionService'
import type { ISessionDomain } from '@src/types/session'
import type { Session } from '@src/types/session'

const mockSession: Session = {
  id: 'test-id',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  procedure: 'test',
  claude_session_id: 'test-id',
  working_dir: '/tmp',
  metadata: { status: 'active', tags: [] }
}

function makeMockDomain(): ISessionDomain {
  return {
    create: vi.fn().mockResolvedValue(mockSession),
    get: vi.fn().mockResolvedValue(mockSession),
    getPath: vi.fn().mockReturnValue('/tmp/sessions/test-id.json'),
    list: vi.fn().mockResolvedValue([mockSession]),
    delete: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue({
      ...mockSession,
      metadata: { ...mockSession.metadata, status: 'completed' }
    })
  }
}

describe('SessionService', () => {
  let domain: ISessionDomain
  let service: SessionService

  beforeEach(() => {
    domain = makeMockDomain()
    service = new SessionService(domain)
  })

  it('delegates create to domain', async () => {
    const params = { procedure: 'p1', tags: ['t1'] }
    const result = await service.create(params)
    expect(domain.create).toHaveBeenCalledWith(params)
    expect(result).toBe(mockSession)
  })

  it('delegates get to domain', async () => {
    const result = await service.get('test-id')
    expect(domain.get).toHaveBeenCalledWith('test-id')
    expect(result).toBe(mockSession)
  })

  it('delegates getPath to domain', () => {
    const result = service.getPath('test-id')
    expect(domain.getPath).toHaveBeenCalledWith('test-id')
    expect(result).toBe('/tmp/sessions/test-id.json')
  })

  it('delegates list to domain', async () => {
    const result = await service.list()
    expect(domain.list).toHaveBeenCalled()
    expect(result).toEqual([mockSession])
  })

  it('delegates delete to domain', async () => {
    await service.delete('test-id')
    expect(domain.delete).toHaveBeenCalledWith('test-id')
  })

  it('delegates updateStatus to domain', async () => {
    const result = await service.updateStatus('test-id', 'completed')
    expect(domain.updateStatus).toHaveBeenCalledWith('test-id', 'completed')
    expect(result.metadata.status).toBe('completed')
  })
})

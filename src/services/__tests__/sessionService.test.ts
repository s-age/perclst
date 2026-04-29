import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionService } from '../sessionService'
import type { Session } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'

const mockSession: Session = {
  id: 'test-id',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  procedure: 'test',
  claude_session_id: 'test-id',
  working_dir: '/tmp',
  metadata: { status: 'active', labels: [] }
}

function makeMockDomain(): ISessionDomain {
  return {
    create: vi.fn().mockResolvedValue(mockSession),
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(mockSession),
    getPath: vi.fn().mockReturnValue('/tmp/sessions/test-id.json'),
    list: vi.fn().mockResolvedValue([mockSession]),
    delete: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue({
      ...mockSession,
      metadata: { ...mockSession.metadata, status: 'completed' }
    }),
    rename: vi.fn().mockResolvedValue({
      ...mockSession,
      id: 'renamed-id'
    }),
    setLabels: vi.fn().mockResolvedValue({
      ...mockSession,
      metadata: { ...mockSession.metadata, labels: ['tag1'] }
    }),
    addLabels: vi.fn().mockResolvedValue({
      ...mockSession,
      metadata: { ...mockSession.metadata, labels: ['existing', 'new'] }
    }),
    findByName: vi.fn().mockResolvedValue(mockSession),
    resolveId: vi.fn().mockResolvedValue('test-id'),
    createRewind: vi.fn().mockResolvedValue({
      ...mockSession,
      id: 'rewind-session-id'
    }),
    sweep: vi.fn().mockResolvedValue([mockSession])
  }
}

describe('SessionService', () => {
  let domain: ISessionDomain
  let service: SessionService

  beforeEach(() => {
    domain = makeMockDomain()
    service = new SessionService(domain)
  })

  it('delegates get to domain', async () => {
    const result = await service.get('test-id')
    expect(domain.get).toHaveBeenCalledWith('test-id')
    expect(result).toBe(mockSession)
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

  it('delegates rename to domain', async () => {
    const result = await service.rename('test-id', 'new-name')
    expect(domain.rename).toHaveBeenCalledWith('test-id', 'new-name')
    expect(result.id).toBe('renamed-id')
  })

  it('delegates findByName to domain', async () => {
    const result = await service.findByName('my-session')
    expect(domain.findByName).toHaveBeenCalledWith('my-session')
    expect(result).toBe(mockSession)
  })

  it('delegates findByName to domain and returns null when not found', async () => {
    vi.mocked(domain.findByName).mockResolvedValue(null)
    const result = await service.findByName('nonexistent')
    expect(domain.findByName).toHaveBeenCalledWith('nonexistent')
    expect(result).toBeNull()
  })

  it('delegates resolveId to domain', async () => {
    const result = await service.resolveId('test-id-or-name')
    expect(domain.resolveId).toHaveBeenCalledWith('test-id-or-name')
    expect(result).toBe('test-id')
  })

  it('delegates createRewindSession to domain with all parameters', async () => {
    const result = await service.createRewindSession('original-id', 'msg-123', 'Rewind Session')
    expect(domain.createRewind).toHaveBeenCalledWith('original-id', 'msg-123', 'Rewind Session')
    expect(result.id).toBe('rewind-session-id')
  })

  it('delegates createRewindSession to domain with undefined messageId', async () => {
    const result = await service.createRewindSession('original-id', undefined, 'Rewind Session')
    expect(domain.createRewind).toHaveBeenCalledWith('original-id', undefined, 'Rewind Session')
    expect(result.id).toBe('rewind-session-id')
  })

  it('delegates createRewindSession to domain with undefined name', async () => {
    const result = await service.createRewindSession('original-id', 'msg-123', undefined)
    expect(domain.createRewind).toHaveBeenCalledWith('original-id', 'msg-123', undefined)
    expect(result.id).toBe('rewind-session-id')
  })

  it('delegates sweep to domain with dryRun false', async () => {
    const filter = { to: '2024-01-01T00:00:00.000Z' }
    const result = await service.sweep(filter, false)
    expect(domain.sweep).toHaveBeenCalledWith(filter, false)
    expect(result).toEqual([mockSession])
  })

  it('delegates sweep to domain with dryRun true', async () => {
    const filter = { to: '2024-01-01T00:00:00.000Z' }
    const result = await service.sweep(filter, true)
    expect(domain.sweep).toHaveBeenCalledWith(filter, true)
    expect(result).toEqual([mockSession])
  })

  it('delegates sweep to domain with empty filter and dryRun false', async () => {
    const filter = {}
    const result = await service.sweep(filter, false)
    expect(domain.sweep).toHaveBeenCalledWith(filter, false)
    expect(result).toEqual([mockSession])
  })

  it('delegates setLabels to domain', async () => {
    const result = await service.setLabels('test-id', ['tag1'])
    expect(domain.setLabels).toHaveBeenCalledWith('test-id', ['tag1'])
    expect(result.metadata.labels).toEqual(['tag1'])
  })

  it('delegates addLabels to domain', async () => {
    const result = await service.addLabels('test-id', ['new'])
    expect(domain.addLabels).toHaveBeenCalledWith('test-id', ['new'])
    expect(result.metadata.labels).toEqual(['existing', 'new'])
  })
})

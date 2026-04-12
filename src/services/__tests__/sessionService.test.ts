import { describe, it, expect, beforeEach } from 'vitest'
import { SessionService } from '../sessionService'
import { InMemorySessionRepository } from '../../infrastructures/__tests__/inMemorySessionRepository'

describe('SessionService', () => {
  let repository: InMemorySessionRepository
  let service: SessionService

  beforeEach(() => {
    repository = new InMemorySessionRepository()
    service = new SessionService(repository)
  })

  it('should create a new session', async () => {
    const session = await service.create({
      procedure: 'test-procedure',
      tags: ['tag1', 'tag2']
    })

    expect(session.id).toBeDefined()
    expect(session.procedure).toBe('test-procedure')
    expect(session.metadata.tags).toContain('tag1')
    expect(session.metadata.status).toBe('active')

    const loaded = await repository.load(session.id)
    expect(loaded).toEqual(session)
  })

  it('should list sessions in descending order of updated_at', async () => {
    const s1 = await service.create({ procedure: 'p1' })
    const s2 = await service.create({ procedure: 'p2' })

    // Manually update updated_at for s1 to be later
    s1.updated_at = new Date(Date.now() + 1000).toISOString()
    await repository.save(s1)

    const list = await service.list()
    expect(list[0].id).toBe(s1.id)
    expect(list[1].id).toBe(s2.id)
  })

  it('should delete a session', async () => {
    const session = await service.create({ procedure: 'p1' })
    await service.delete(session.id)

    await expect(service.get(session.id)).rejects.toThrow()
  })

  it('should update session status', async () => {
    const session = await service.create({ procedure: 'p1' })
    const updated = await service.updateStatus(session.id, 'completed')

    expect(updated.metadata.status).toBe('completed')
    const loaded = await service.get(session.id)
    expect(loaded.metadata.status).toBe('completed')
  })
})

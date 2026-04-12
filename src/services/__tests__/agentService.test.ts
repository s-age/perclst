import { describe, it, expect, beforeEach } from 'vitest'
import { AgentService } from '../agentService'
import { InMemorySessionRepository } from '../../infrastructures/__tests__/inMemorySessionRepository'
import { InMemoryProcedureLoader } from '../../infrastructures/__tests__/inMemoryProcedureLoader'
import { MockAgentClient } from '../../infrastructures/__tests__/mockAgentClient'
import { InMemoryConfigProvider } from '../../infrastructures/__tests__/inMemoryConfigProvider'

describe('AgentService', () => {
  let repository: InMemorySessionRepository
  let loader: InMemoryProcedureLoader
  let client: MockAgentClient
  let config: InMemoryConfigProvider
  let service: AgentService

  beforeEach(() => {
    repository = new InMemorySessionRepository()
    loader = new InMemoryProcedureLoader()
    client = new MockAgentClient()
    config = new InMemoryConfigProvider()
    service = new AgentService(repository, loader, client, config)
  })

  it('should execute a task and update session status', async () => {
    const session = {
      id: 'test-session',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      procedure: 'conductor',
      claude_session_id: 'claude-id',
      working_dir: '/tmp',
      metadata: { status: 'active' as const, tags: [] }
    }
    await repository.save(session)
    loader.register('conductor', 'You are a conductor.')

    const response = await service.execute('test-session', 'Hello')

    expect(response.content).toBe('Mock response')
    expect(client.lastRequest?.system).toBe('You are a conductor.')
    expect(client.lastRequest?.instruction).toBe('Hello')

    const updated = await repository.load('test-session')
    expect(updated.metadata.status).toBe('active')
  })

  it('should create a new session and execute the task', async () => {
    loader.register('conductor', 'You are a conductor.')

    const { sessionId, response } = await service.start('Hello', { procedure: 'conductor' })

    expect(sessionId).toBeDefined()
    expect(response.content).toBe('Mock response')
    expect(client.lastRequest?.system).toBe('You are a conductor.')
    expect(client.lastRequest?.instruction).toBe('Hello')
    expect(client.lastRequest?.isResume).toBe(false)

    const saved = await repository.load(sessionId)
    expect(saved.procedure).toBe('conductor')
    expect(saved.metadata.status).toBe('active')
  })

  it('should resume a session', async () => {
    const session = {
      id: 'test-session',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      claude_session_id: 'claude-id',
      working_dir: '/tmp',
      metadata: { status: 'active' as const, tags: [] }
    }
    await repository.save(session)

    await service.resume('test-session', 'Continue')

    expect(client.lastRequest?.isResume).toBe(true)
    expect(client.lastRequest?.instruction).toBe('Continue')
  })
})

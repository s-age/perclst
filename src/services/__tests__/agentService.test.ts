import { describe, it, expect, beforeEach } from 'vitest'
import { AgentService } from '../agentService'
import { InMemoryProcedureLoader } from '../../infrastructures/__tests__/inMemoryProcedureLoader'
import { MockAgentClient } from '../../infrastructures/__tests__/mockAgentClient'
import { InMemoryConfigProvider } from '../../infrastructures/__tests__/inMemoryConfigProvider'

describe('AgentService', () => {
  let loader: InMemoryProcedureLoader
  let client: MockAgentClient
  let config: InMemoryConfigProvider
  let service: AgentService

  const session = {
    id: 'test-session',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    procedure: 'conductor',
    claude_session_id: 'claude-id',
    working_dir: '/tmp',
    metadata: { status: 'active' as const, tags: [] }
  }

  beforeEach(() => {
    loader = new InMemoryProcedureLoader()
    client = new MockAgentClient()
    config = new InMemoryConfigProvider()
    service = new AgentService(loader, client, config)
  })

  it('should run a task with the procedure system prompt', async () => {
    loader.register('conductor', 'You are a conductor.')

    const response = await service.run(session, 'Hello', false)

    expect(response.content).toBe('Mock response')
    expect(client.lastRequest?.system).toBe('You are a conductor.')
    expect(client.lastRequest?.instruction).toBe('Hello')
    expect(client.lastRequest?.isResume).toBe(false)
  })

  it('should run without a system prompt when no procedure is set', async () => {
    const sessionWithoutProcedure = { ...session, procedure: undefined }

    await service.run(sessionWithoutProcedure, 'Hello', false)

    expect(client.lastRequest?.system).toBeUndefined()
  })

  it('should pass isResume=true when resuming', async () => {
    loader.register('conductor', 'You are a conductor.')

    await service.run(session, 'Continue', true)

    expect(client.lastRequest?.isResume).toBe(true)
    expect(client.lastRequest?.instruction).toBe('Continue')
  })

  it('should override model from options', async () => {
    loader.register('conductor', 'You are a conductor.')

    await service.run(session, 'Hello', false, { model: 'claude-opus-4-6' })

    expect(client.lastRequest?.config.model).toBe('claude-opus-4-6')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentService } from '../agentService'
import type { IAgentDomain } from '@src/domains/agent'
import type { Session } from '@src/types/session'

const mockSession: Session = {
  id: 'test-session',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  procedure: 'conductor',
  claude_session_id: 'claude-id',
  working_dir: '/tmp',
  metadata: { status: 'active', tags: [] }
}

const mockResponse = {
  content: 'Mock response',
  model: 'mock-model',
  usage: { input_tokens: 10, output_tokens: 10 }
}

describe('AgentService', () => {
  let domain: IAgentDomain
  let service: AgentService

  beforeEach(() => {
    domain = { run: vi.fn().mockResolvedValue(mockResponse) }
    service = new AgentService(domain)
  })

  it('delegates run to domain', async () => {
    const options = { model: 'claude-opus-4-6' }
    const result = await service.run(mockSession, 'Hello', false, options)
    expect(domain.run).toHaveBeenCalledWith(mockSession, 'Hello', false, options)
    expect(result).toBe(mockResponse)
  })

  it('passes empty options by default', async () => {
    await service.run(mockSession, 'Hello', true)
    expect(domain.run).toHaveBeenCalledWith(mockSession, 'Hello', true, {})
  })
})

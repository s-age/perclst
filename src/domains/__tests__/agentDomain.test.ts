import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@src/infrastructures/claudeCode', () => ({
  dispatch: vi.fn()
}))

vi.mock('@src/repositories/procedures', () => ({
  loadProcedure: vi.fn()
}))

import { dispatch } from '@src/infrastructures/claudeCode'
import { loadProcedure } from '@src/repositories/procedures'
import { AgentDomain } from '../agent'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

describe('AgentDomain', () => {
  let domain: AgentDomain

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
    vi.clearAllMocks()
    domain = new AgentDomain(DEFAULT_MODEL)

    vi.mocked(dispatch).mockResolvedValue({
      content: 'Mock response',
      thoughts: [],
      tool_history: [],
      usage: { input_tokens: 10, output_tokens: 10 }
    })
  })

  it('should run a task with the procedure system prompt', async () => {
    vi.mocked(loadProcedure).mockReturnValue('You are a conductor.')

    const response = await domain.run(session, 'Hello', false)

    expect(response.content).toBe('Mock response')
    expect(loadProcedure).toHaveBeenCalledWith('conductor')
    expect(vi.mocked(dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: 'You are a conductor.',
        prompt: 'Hello'
      })
    )
  })

  it('should run without a system prompt when no procedure is set', async () => {
    const sessionWithoutProcedure = { ...session, procedure: undefined }

    await domain.run(sessionWithoutProcedure, 'Hello', false)

    expect(loadProcedure).not.toHaveBeenCalled()
    expect(vi.mocked(dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: undefined
      })
    )
  })

  it('should dispatch a resume action when resuming', async () => {
    await domain.run(session, 'Continue', true)

    expect(vi.mocked(dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resume',
        prompt: 'Continue'
      })
    )
  })

  it('should override model from options', async () => {
    await domain.run(session, 'Hello', false, { model: 'claude-opus-4-6' })

    expect(vi.mocked(dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6'
      })
    )
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IClaudeCodeRepository, IProcedureRepository } from '@src/repositories/ports/agent'
import { AgentDomain } from '../agent'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

describe('AgentDomain', () => {
  let domain: AgentDomain
  let claudeCodeRepo: IClaudeCodeRepository
  let procedureRepo: IProcedureRepository

  const session = {
    id: 'test-session',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    procedure: 'conductor',
    claude_session_id: 'claude-id',
    working_dir: '/tmp',
    metadata: { status: 'active' as const, labels: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    claudeCodeRepo = {
      dispatch: vi.fn().mockResolvedValue({
        content: 'Mock response',
        thoughts: [],
        tool_history: [],
        usage: { input_tokens: 10, output_tokens: 10 }
      })
    }

    procedureRepo = {
      load: vi.fn(),
      exists: vi.fn()
    }

    domain = new AgentDomain(DEFAULT_MODEL, claudeCodeRepo, procedureRepo)
  })

  it('should run a task with the procedure system prompt', async () => {
    vi.mocked(procedureRepo.load).mockReturnValue('You are a conductor.')

    const response = await domain.run(session, 'Hello', false)

    expect(response.content).toBe('Mock response')
    expect(procedureRepo.load).toHaveBeenCalledWith('conductor', '/tmp')
    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: 'You are a conductor.',
        prompt: 'Hello'
      }),
      undefined
    )
  })

  it('should run without a system prompt when no procedure is set', async () => {
    const sessionWithoutProcedure = { ...session, procedure: undefined }

    await domain.run(sessionWithoutProcedure, 'Hello', false)

    expect(procedureRepo.load).not.toHaveBeenCalled()
    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        system: undefined
      }),
      undefined
    )
  })

  it('should dispatch a resume action when resuming', async () => {
    await domain.run(session, 'Continue', true)

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resume',
        prompt: 'Continue'
      }),
      undefined
    )
  })

  it('should override model from options', async () => {
    await domain.run(session, 'Hello', false, { model: 'claude-opus-4-6' })

    expect(vi.mocked(claudeCodeRepo.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6'
      }),
      undefined
    )
  })
})

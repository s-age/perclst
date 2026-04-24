import { vi } from 'vitest'
import type { AgentResponse } from '@src/types/agent'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { ScriptResult } from '@src/domains/ports/script'
import { PipelineDomain } from '@src/domains/pipeline'
import { PipelineService } from '../../../pipelineService'

const STUB_RESPONSE: AgentResponse = {
  content: 'done',
  model: 'stub',
  usage: { input_tokens: 0, output_tokens: 0 }
}

function createStubAgentDomain(): IAgentDomain {
  return {
    run: vi.fn(async () => STUB_RESPONSE),
    fork: vi.fn(async () => STUB_RESPONSE),
    resume: vi.fn(async () => STUB_RESPONSE),
    isLimitExceeded: () => false
  }
}

function createStubSessionDomain(): ISessionDomain {
  let counter = 0
  return {
    create: async (params) => ({
      id: `session-${++counter}`,
      name: params.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      claude_session_id: `claude-${counter}`,
      working_dir: params.working_dir,
      metadata: { status: 'active' as const, labels: [] }
    }),
    findByName: async () => null,
    getPath: (id: string) => `/tmp/stub/${id}.json`,
    updateStatus: async () => ({}) as any
  } as ISessionDomain
}

function createStubRejectionFeedbackRepo(): IRejectionFeedbackRepository {
  return {
    getFeedback: async () => undefined,
    getCwd: () => '/test'
  }
}

function createStubScriptDomain(results: ScriptResult[]) {
  let callIndex = 0
  return {
    run: async () => results[callIndex++] ?? { exitCode: 0, stdout: '', stderr: '' }
  }
}

export function buildRetryService(scriptResults: ScriptResult[]) {
  const agentDomain = createStubAgentDomain()
  const pipelineDomain = new PipelineDomain(
    agentDomain,
    createStubSessionDomain(),
    createStubRejectionFeedbackRepo()
  )
  const service = new PipelineService(pipelineDomain, createStubScriptDomain(scriptResults))

  return { service, agentDomain }
}

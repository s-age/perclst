import { vi, describe, it, expect } from 'vitest'
import type { Pipeline } from '@src/types/pipeline'
import type { AgentResponse } from '@src/types/agent'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { ScriptResult } from '@src/domains/ports/script'
import { PipelineDomain } from '../../pipeline'
import { PipelineService, type PipelineTaskResult } from '@src/services/pipelineService'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'

vi.mock('@src/utils/output', () => ({ debug: { print: vi.fn() } }))

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
    getPath: (id) => `/tmp/stub/${id}.json`,
    updateStatus: async (_id, _status) => ({}) as any
  } as ISessionDomain
}

function createStubRejectionFeedbackRepo(cwd = '/test'): IRejectionFeedbackRepository {
  return {
    getFeedback: async () => undefined,
    getCwd: () => cwd
  }
}

function createStubScriptDomain(results: ScriptResult[]) {
  let callIndex = 0
  return {
    run: async () => results[callIndex++] ?? { exitCode: 0, stdout: '', stderr: '' }
  }
}

function markDone(pipeline: Pipeline) {
  return (_taskPath: number[], taskIndex: number): void => {
    pipeline.tasks[taskIndex].done = true
  }
}

async function collectEvents(
  service: PipelineService,
  pipeline: Pipeline,
  options?: Parameters<typeof service.run>[1]
): Promise<PipelineTaskResult[]> {
  const events: PipelineTaskResult[] = []
  for await (const event of service.run(pipeline, options)) events.push(event)
  return events
}

function buildService(scriptResults: ScriptResult[]) {
  const agentDomain = createStubAgentDomain()
  const sessionDomain = createStubSessionDomain()
  const rejectionRepo = createStubRejectionFeedbackRepo()
  const scriptDomain = createStubScriptDomain(scriptResults)

  const pipelineDomain = new PipelineDomain(agentDomain, sessionDomain, rejectionRepo)
  const service = new PipelineService(pipelineDomain, scriptDomain)

  return { service, agentDomain }
}

describe('PipelineService retry flow (stub integration)', () => {
  it('agent re-runs with rejection context when done flag is set by onTaskDone', async () => {
    const { service, agentDomain } = buildService([
      { exitCode: 1, stdout: 'lint failed', stderr: '' },
      { exitCode: 0, stdout: 'ok', stderr: '' }
    ])

    const pipeline: Pipeline = {
      tasks: [
        { type: 'agent', task: 'fix code', name: 'fixer' },
        { type: 'script', command: 'npm run lint', rejected: { to: 'fixer', max_retries: 2 } }
      ]
    }

    await collectEvents(service, pipeline, { onTaskDone: markDone(pipeline) })

    const agentCalls = vi.mocked(agentDomain.run).mock.calls
    expect(agentCalls).toHaveLength(2)
    const secondInstruction = agentCalls[1][1]
    expect(secondInstruction).toContain('[Retry 1]')
    expect(secondInstruction).toContain('lint failed')
  })

  it('throws PipelineMaxRetriesError after exhausting retries with done flag', async () => {
    const { service } = buildService([
      { exitCode: 1, stdout: 'fail 1', stderr: '' },
      { exitCode: 1, stdout: 'fail 2', stderr: '' }
    ])

    const pipeline: Pipeline = {
      tasks: [
        { type: 'agent', task: 'fix code', name: 'fixer' },
        { type: 'script', command: 'npm run lint', rejected: { to: 'fixer', max_retries: 1 } }
      ]
    }

    await expect(
      collectEvents(service, pipeline, { onTaskDone: markDone(pipeline) })
    ).rejects.toThrow(PipelineMaxRetriesError)
  })

  it('done flag is false on retry target after rejection jump', async () => {
    const { service } = buildService([
      { exitCode: 1, stdout: 'error', stderr: '' },
      { exitCode: 0, stdout: 'ok', stderr: '' }
    ])

    const pipeline: Pipeline = {
      tasks: [
        { type: 'agent', task: 'fix code', name: 'fixer' },
        { type: 'script', command: 'check', rejected: { to: 'fixer', max_retries: 2 } }
      ]
    }

    await collectEvents(service, pipeline, { onTaskDone: markDone(pipeline) })

    expect(pipeline.tasks[0].done).toBe(true)
    expect(pipeline.tasks[1].done).toBe(true)
  })

  it('script without rejection config does not affect done flags', async () => {
    const { service } = buildService([{ exitCode: 1, stdout: 'fail', stderr: '' }])

    const pipeline: Pipeline = {
      tasks: [
        { type: 'agent', task: 'work', name: 'worker' },
        { type: 'script', command: 'check' }
      ]
    }

    await collectEvents(service, pipeline, { onTaskDone: markDone(pipeline) })

    expect(pipeline.tasks[0].done).toBe(true)
    expect(pipeline.tasks[1].done).toBe(true)
  })
})

import { vi, describe, it, expect } from 'vitest'
import type { Pipeline } from '@src/types/pipeline'
import type { PipelineTaskResult } from '../../pipelineService'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { buildRetryService } from './helpers/buildRetryService'

vi.mock('@src/utils/output', () => ({ debug: { print: vi.fn() } }))

function markDone(pipeline: Pipeline) {
  return (_taskPath: number[], taskIndex: number): void => {
    pipeline.tasks[taskIndex].done = true
  }
}

async function collectEvents(
  service: { run: (...args: any[]) => AsyncGenerator<PipelineTaskResult> },
  pipeline: Pipeline,
  options?: Parameters<typeof service.run>[1]
): Promise<PipelineTaskResult[]> {
  const events: PipelineTaskResult[] = []
  for await (const event of service.run(pipeline, options)) events.push(event)
  return events
}

describe('PipelineService retry flow (stub integration)', () => {
  it('agent re-runs with rejection context when done flag is set by onTaskDone', async () => {
    const { service, agentDomain } = buildRetryService([
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
    const { service } = buildRetryService([
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
    const { service } = buildRetryService([
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
    const { service } = buildRetryService([{ exitCode: 1, stdout: 'fail', stderr: '' }])

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

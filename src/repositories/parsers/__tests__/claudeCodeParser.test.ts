import { describe, it, expect } from 'vitest'
import { createParseState, processLine, finalizeParseState } from '../claudeCodeParser'
import type { RawOutput } from '@src/types/claudeCode'

function parseStreamEvents(lines: string[], jsonlBaseline: number): RawOutput {
  const state = createParseState()
  for (const line of lines) processLine(state, line)
  return finalizeParseState(state, jsonlBaseline)
}

function lines(...events: object[]): string[] {
  return events.map((e) => JSON.stringify(e))
}

const assistantEvent = (
  content: object[],
  usage?: object
): {
  type: string
  message: { role: string; content: object[]; usage?: object | undefined }
} => ({
  type: 'assistant',
  message: { role: 'assistant', content, ...(usage ? { usage } : {}) }
})

const userToolResultEvent = (
  toolUseId: string,
  content: string
): {
  type: string
  message: {
    role: string
    content: { type: string; tool_use_id: string; content: string }[]
  }
} => ({
  type: 'user',
  message: {
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: toolUseId, content }]
  }
})

const resultEvent = (
  result: string,
  usage?: object
): {
  type: string
  result: string
  usage?: object | undefined
} => ({
  type: 'result',
  result,
  ...(usage ? { usage } : {})
})

describe('parseStreamEvents', () => {
  it('extracts final content from result event', () => {
    const output = parseStreamEvents(
      lines(assistantEvent([{ type: 'text', text: 'hello' }]), resultEvent('Done')),
      0
    )
    expect(output.content).toBe('Done')
  })

  it('accumulates usage from result event', () => {
    const usage = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 5 }
    const output = parseStreamEvents(lines(resultEvent('ok', usage)), 0)
    expect(output.usage).toEqual(usage)
  })

  it('collects thinking blocks', () => {
    const output = parseStreamEvents(
      lines(assistantEvent([{ type: 'thinking', thinking: 'I think...' }])),
      0
    )
    expect(output.thoughts).toEqual([{ type: 'thinking', thinking: 'I think...' }])
  })

  it('tracks tool use and pairs with tool results', () => {
    const toolUseBlock = { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { cmd: 'ls' } }
    const output = parseStreamEvents(
      lines(
        assistantEvent([toolUseBlock]),
        userToolResultEvent('tool-1', 'file.txt'),
        resultEvent('done')
      ),
      0
    )
    expect(output.tool_history).toHaveLength(1)
    expect(output.tool_history[0]).toMatchObject({ id: 'tool-1', name: 'Bash', result: 'file.txt' })
  })

  it('filters out permission tool from tool_history', () => {
    const permissionBlock = {
      type: 'tool_use',
      id: 'perm-1',
      name: 'mcp__perclst__ask_permission',
      input: {}
    }
    const output = parseStreamEvents(
      lines(
        assistantEvent([permissionBlock]),
        userToolResultEvent('perm-1', 'approved'),
        resultEvent('done')
      ),
      0
    )
    expect(output.tool_history).toHaveLength(0)
  })

  it('permission tool result does not increment userToolResultEventCount', () => {
    const permBlock = {
      type: 'tool_use',
      id: 'p1',
      name: 'mcp__perclst__ask_permission',
      input: {}
    }
    const output = parseStreamEvents(
      lines(assistantEvent([permBlock]), userToolResultEvent('p1', 'ok'), resultEvent('done')),
      0
    )
    // baseline=0, +1 for result, assistantEventCount=0 (only perm tool), userToolResultEventCount=0
    expect(output.message_count).toBe(1)
  })

  it('calculates message_count with jsonlBaseline', () => {
    const toolBlock = { type: 'tool_use', id: 't1', name: 'Read', input: {} }
    const output = parseStreamEvents(
      lines(
        assistantEvent([toolBlock]),
        userToolResultEvent('t1', 'content'),
        assistantEvent([{ type: 'text', text: 'hi' }]),
        resultEvent('final')
      ),
      3
    )
    // baseline=3, +1 result, assistantEventCount=2, userToolResultEventCount=1 → 3+1+2+1=7
    expect(output.message_count).toBe(7)
  })

  it('records last_assistant_usage from most recent assistant message', () => {
    const usage1 = { input_tokens: 10, output_tokens: 5 }
    const usage2 = { input_tokens: 20, output_tokens: 15 }
    const output = parseStreamEvents(
      lines(
        assistantEvent([{ type: 'text', text: 'a' }], usage1),
        assistantEvent([{ type: 'text', text: 'b' }], usage2),
        resultEvent('done')
      ),
      0
    )
    expect(output.last_assistant_usage).toMatchObject(usage2)
  })

  it('skips malformed JSON lines without throwing', () => {
    const output = parseStreamEvents([...lines(resultEvent('ok')), 'not-valid-json', ''], 0)
    expect(output.content).toBe('ok')
  })

  it('returns empty defaults when no events', () => {
    const output = parseStreamEvents([], 0)
    expect(output.content).toBe('')
    expect(output.thoughts).toEqual([])
    expect(output.tool_history).toEqual([])
    expect(output.usage).toEqual({ input_tokens: 0, output_tokens: 0 })
    expect(output.message_count).toBe(1)
  })
})

describe('history cap', () => {
  it('caps thoughts at MAX_HISTORY_ENTRIES keeping newest', () => {
    const state = createParseState()
    for (let i = 0; i < 210; i++) {
      processLine(
        state,
        JSON.stringify(assistantEvent([{ type: 'thinking', thinking: `thought-${i}` }]))
      )
    }
    const output = finalizeParseState(state, 0)
    expect(output.thoughts).toHaveLength(200)
    expect(output.thoughts[0].thinking).toBe('thought-10')
    expect(output.thoughts[199].thinking).toBe('thought-209')
  })

  it('caps toolMap at MAX_HISTORY_ENTRIES keeping newest', () => {
    const state = createParseState()
    for (let i = 0; i < 210; i++) {
      processLine(
        state,
        JSON.stringify(
          assistantEvent([{ type: 'tool_use', id: `t-${i}`, name: 'Bash', input: { i } }])
        )
      )
    }
    const output = finalizeParseState(state, 0)
    expect(output.tool_history).toHaveLength(200)
    expect(output.tool_history[0].id).toBe('t-10')
    expect(output.tool_history[199].id).toBe('t-209')
  })

  it('preserves message_count regardless of cap', () => {
    const state = createParseState()
    for (let i = 0; i < 210; i++) {
      processLine(
        state,
        JSON.stringify(
          assistantEvent([{ type: 'tool_use', id: `t-${i}`, name: 'Read', input: {} }])
        )
      )
      processLine(state, JSON.stringify(userToolResultEvent(`t-${i}`, `result-${i}`)))
    }
    processLine(state, JSON.stringify(resultEvent('done')))
    const output = finalizeParseState(state, 0)
    // assistantEventCount=210, userToolResultEventCount=210, baseline=0 → 0+1+210+210=421
    expect(output.message_count).toBe(421)
  })
})

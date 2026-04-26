/**
 * Verifies that the incremental messages_total formula used in agentRepository.ts
 * agrees with computeMessagesTotalFromContent on the equivalent JSONL content.
 *
 * Formula under test:
 *   messages_total = baselineTurnsTotal + 1 + state.assistantEventCount + 2 * state.toolCallCount
 *
 * The `baselineTurnsTotal` (pre-run) and the final `computeMessagesTotalFromContent` (post-run)
 * both parse the JSONL file; the delta is derived from stream events.  These tests confirm the
 * two methods agree, ensuring the stream event granularity assumption holds.
 */
import { describe, it, expect } from 'vitest'
import { createParseState, processLine } from '../claudeCodeParser'
import { computeMessagesTotalFromContent } from '../claudeSessionParser'

function jsonl(...events: object[]): string {
  return events.map((e) => JSON.stringify(e)).join('\n')
}

function user(content: string | object[]): object {
  return { type: 'user', message: { content } }
}
function assistant(content: object[]): object {
  return { type: 'assistant', uuid: 'uuid-placeholder', message: { content } }
}
function toolUse(id: string, name: string): object {
  return { type: 'tool_use', id, name, input: {} }
}
function toolResult(id: string): object {
  return { type: 'tool_result', tool_use_id: id, content: 'result' }
}

function computeIncremental(baselineContent: string, streamLines: string[]): number {
  const state = createParseState()
  for (const line of streamLines) processLine(state, line)
  const baselineTurnsTotal = computeMessagesTotalFromContent(baselineContent)
  return baselineTurnsTotal + 1 + state.assistantEventCount + 2 * state.toolCallCount
}

describe('messages_total: incremental formula == JSONL-full parse', () => {
  it('simple text response, no existing session', () => {
    const fullContent = jsonl(user('do something'), assistant([{ type: 'text', text: 'done' }]))

    const streamLines = [
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } })
    ]

    expect(computeIncremental('', streamLines)).toBe(computeMessagesTotalFromContent(fullContent))
  })

  it('one tool call: assistant(tool) + user(result) + assistant(text)', () => {
    const fullContent = jsonl(
      user('do something'),
      assistant([toolUse('t1', 'Bash')]),
      user([toolResult('t1')]),
      assistant([{ type: 'text', text: 'done' }])
    )

    const streamLines = [
      JSON.stringify({ type: 'assistant', message: { content: [toolUse('t1', 'Bash')] } }),
      JSON.stringify({ type: 'user', message: { content: [toolResult('t1')] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } })
    ]

    expect(computeIncremental('', streamLines)).toBe(computeMessagesTotalFromContent(fullContent))
  })

  it('thinking block emitted as separate entry before text+tool', () => {
    // Claude Code / --verbose splits thinking-only entries from text+tool entries
    const fullContent = jsonl(
      user('do something'),
      assistant([{ type: 'thinking', thinking: 'hmm' }]),
      assistant([{ type: 'text', text: 'plan' }, toolUse('t1', 'Bash')]),
      user([toolResult('t1')]),
      assistant([{ type: 'text', text: 'done' }])
    )

    const streamLines = [
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'thinking', thinking: 'hmm' }] }
      }),
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'plan' }, toolUse('t1', 'Bash')] }
      }),
      JSON.stringify({ type: 'user', message: { content: [toolResult('t1')] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } })
    ]

    expect(computeIncremental('', streamLines)).toBe(computeMessagesTotalFromContent(fullContent))
  })

  it('two consecutive tool calls before final text', () => {
    const fullContent = jsonl(
      user('do something'),
      assistant([toolUse('t1', 'Bash')]),
      user([toolResult('t1')]),
      assistant([toolUse('t2', 'Read')]),
      user([toolResult('t2')]),
      assistant([{ type: 'text', text: 'done' }])
    )

    const streamLines = [
      JSON.stringify({ type: 'assistant', message: { content: [toolUse('t1', 'Bash')] } }),
      JSON.stringify({ type: 'user', message: { content: [toolResult('t1')] } }),
      JSON.stringify({ type: 'assistant', message: { content: [toolUse('t2', 'Read')] } }),
      JSON.stringify({ type: 'user', message: { content: [toolResult('t2')] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } })
    ]

    expect(computeIncremental('', streamLines)).toBe(computeMessagesTotalFromContent(fullContent))
  })

  it('resume with existing baseline: incremental delta is consistent', () => {
    // Existing session has 1 previous user+assistant exchange
    const baseline = jsonl(
      user('previous task'),
      assistant([{ type: 'text', text: 'previous result' }])
    )

    // New run appends another user+assistant exchange
    const fullContent = jsonl(
      user('previous task'),
      assistant([{ type: 'text', text: 'previous result' }]),
      user('continue'),
      assistant([toolUse('t1', 'Bash')]),
      user([toolResult('t1')]),
      assistant([{ type: 'text', text: 'done' }])
    )

    const streamLines = [
      JSON.stringify({ type: 'assistant', message: { content: [toolUse('t1', 'Bash')] } }),
      JSON.stringify({ type: 'user', message: { content: [toolResult('t1')] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } })
    ]

    expect(computeIncremental(baseline, streamLines)).toBe(
      computeMessagesTotalFromContent(fullContent)
    )
  })
})

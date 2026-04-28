import { describe, it, expect } from 'vitest'
import {
  computeMessagesTotalFromContent,
  scanStats,
  buildToolResultMap,
  buildTurns,
  filterEntriesUpTo,
  processAssistantEntry
} from '../../claudeSessionParser'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry
} from '../../claudeSessionParser'

function toJsonl(entries: RawEntry[]): string {
  return entries.map((e) => JSON.stringify(e)).join('\n')
}

describe('computeMessagesTotalFromContent', () => {
  it('should return 0 for empty input', () => {
    expect(computeMessagesTotalFromContent('')).toBe(0)
    expect(computeMessagesTotalFromContent('   ')).toBe(0)
  })

  it('should count a user string message as 1', () => {
    const entries: RawEntry[] = [{ type: 'user', message: { content: 'Hello' } } as RawUserEntry]
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(1)
  })

  it('should count user array content with text blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: { content: [{ type: 'text', text: 'Hello' }] as RawContentBlock[] }
      } as RawUserEntry
    ]
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(1)
  })

  it('should not count user entry that only contains tool_result', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(0)
  })

  it('should count assistant group with text as 1 api call', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'Hi' }] }
      } as RawAssistantEntry
    ]
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(1)
  })

  it('should count tool_use blocks as +2 each (use + result pair)', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [
            { type: 'tool_use', id: 't1', name: 'Read', input: {} },
            { type: 'tool_use', id: 't2', name: 'Write', input: {} }
          ]
        }
      } as RawAssistantEntry
    ]
    // 1 assistant turn + 2 tools * 2 = 5
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(5)
  })

  it('should merge consecutive assistant entries into one group', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'thinking', thinking: 'hmm' }] }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: { content: [{ type: 'text', text: 'answer' }] }
      } as RawAssistantEntry
    ]
    // single group with text → 1
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(1)
  })

  it('should flush group on user entry boundary', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'A1' }] }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'Q2' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }]
        }
      } as RawAssistantEntry
    ]
    // user(1) + assistant(1) + user(1) + assistant(1 + 2) = 6
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(6)
  })

  it('should not count thinking-only assistant group', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'thinking', thinking: 'internal' }] }
      } as RawAssistantEntry
    ]
    expect(computeMessagesTotalFromContent(toJsonl(entries))).toBe(0)
  })
})

describe('scanStats', () => {
  it('should accumulate api calls and tool counts', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Hello' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [
            { type: 'text', text: 'Hi' },
            { type: 'tool_use', id: 't1', name: 'Read', input: {} }
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 200,
            cache_creation_input_tokens: 10
          }
        }
      } as RawAssistantEntry
    ]
    const result = scanStats(toJsonl(entries))
    expect(result.apiCalls).toBe(1)
    expect(result.toolCalls).toBe(1)
    expect(result.tokens.contextWindow).toBe(310) // 100 + 200 + 10
  })

  it('should stop counting after upToMessageId cutoff', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [{ type: 'text', text: 'A1' }],
          usage: { input_tokens: 50, output_tokens: 20 }
        }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'Q2' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'text', text: 'A2' }],
          usage: { input_tokens: 100, output_tokens: 40 }
        }
      } as RawAssistantEntry
    ]
    const result = scanStats(toJsonl(entries), 'a1')
    // cutoff set on a1, flushed on next user entry, then break
    expect(result.apiCalls).toBe(1)
    expect(result.tokens.totalInput).toBe(50)
    expect(result.tokens.totalOutput).toBe(20)
  })

  it('should handle cutoff at end of stream (no trailing user entry)', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [{ type: 'text', text: 'A1' }],
          usage: { input_tokens: 80, output_tokens: 30 }
        }
      } as RawAssistantEntry
    ]
    const result = scanStats(toJsonl(entries), 'a1')
    expect(result.apiCalls).toBe(1)
    expect(result.tokens.totalInput).toBe(80)
  })

  it('should skip assistant entries after cutoff within same group', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [{ type: 'text', text: 'A1' }],
          usage: { input_tokens: 50, output_tokens: 10 }
        }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }],
          usage: { input_tokens: 50, output_tokens: 10 }
        }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'Q2' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a3',
        message: {
          content: [{ type: 'text', text: 'A3' }],
          usage: { input_tokens: 200, output_tokens: 80 }
        }
      } as RawAssistantEntry
    ]
    // cutoff on a1 → a2 is skipped (continue), flush happens on Q2 user entry, then break
    const result = scanStats(toJsonl(entries), 'a1')
    expect(result.apiCalls).toBe(1)
    expect(result.toolCalls).toBe(0)
    // Only a1 tokens counted (a2 skipped due to cutoffReached + continue)
    expect(result.tokens.totalInput).toBe(50)
  })
})

describe('buildToolResultMap — array content branch', () => {
  it('should extract text from RawContentBlock[] tool_result content', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: [
                { type: 'text', text: 'line 1' },
                { type: 'text', text: 'line 2' }
              ]
            }
          ] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const result = buildToolResultMap(entries)
    expect(result.get('tool-1')).toEqual({ text: 'line 1\nline 2', isError: false })
  })

  it('should return null text when array content has no text blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: [{ type: 'thinking', thinking: 'internal' }]
            }
          ] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const result = buildToolResultMap(entries)
    expect(result.get('tool-1')).toEqual({ text: null, isError: false })
  })
})

describe('buildTurns — user array content branch', () => {
  it('should create userMessage turn from array content with text blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'part 1' },
            { type: 'text', text: 'part 2' }
          ] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()
    const { turns } = buildTurns(entries, toolResultMap)
    expect(turns).toHaveLength(1)
    expect(turns[0].userMessage).toBe('part 1\npart 2')
  })

  it('should skip user array content that contains tool_result', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()
    const { turns } = buildTurns(entries, toolResultMap)
    expect(turns).toHaveLength(0)
  })
})

describe('processAssistantEntry — thinking + content mix', () => {
  it('should extract thinking blocks alongside text and tool calls', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [
          { type: 'thinking', thinking: 'step 1' },
          { type: 'thinking', thinking: 'step 2' },
          { type: 'text', text: 'Here is the answer' },
          { type: 'tool_use', id: 't1', name: 'Read', input: { path: '/tmp' } }
        ]
      }
    }
    const toolResultMap = new Map([['t1', { text: 'file content', isError: false }]])
    const result = processAssistantEntry(entry, toolResultMap)!
    expect(result.turn.thinkingBlocks).toEqual(['step 1', 'step 2'])
    expect(result.turn.assistantText).toBe('Here is the answer')
    expect(result.turn.toolCalls).toHaveLength(1)
    expect(result.turn.toolCalls[0].result).toBe('file content')
  })
})

describe('filterEntriesUpTo', () => {
  it('should return all entries when messageId not found', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Hello' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: { content: [{ type: 'text', text: 'Hi' }] }
      } as RawAssistantEntry
    ]
    const result = filterEntriesUpTo(entries, 'nonexistent')
    expect(result).toEqual(entries)
  })

  it('should cut off after the matched assistant entry', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'A1' }] }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'Q2' } } as RawUserEntry
    ]
    const result = filterEntriesUpTo(entries, 'a1')
    expect(result).toHaveLength(2)
  })

  it('should include following user entry if it contains tool_result', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] }
      } as RawAssistantEntry,
      {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: 'done' }
          ] as RawContentBlock[]
        }
      } as RawUserEntry,
      { type: 'user', message: { content: 'Next question' } } as RawUserEntry
    ]
    const result = filterEntriesUpTo(entries, 'a1')
    expect(result).toHaveLength(2)
  })

  it('should not include following user entry if it has no tool_result', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'done' }] }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'thanks' } } as RawUserEntry
    ]
    const result = filterEntriesUpTo(entries, 'a1')
    expect(result).toHaveLength(1)
  })
})

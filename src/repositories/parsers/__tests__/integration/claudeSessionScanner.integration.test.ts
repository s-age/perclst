import { describe, it, expect } from 'vitest'
import {
  computeMessagesTotalFromContent,
  scanStats,
  buildTurns,
  readSessionFromRaw,
  extractAssistantTurnsFromRaw
} from '../../claudeSessionScanner'
import { buildToolResultMap } from '../../claudeSessionParser'
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

describe('readSessionFromRaw', () => {
  it('should produce identical results to parseRawEntries+buildToolResultMap+buildTurns pipeline', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Hello' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [
            { type: 'text', text: 'Hi' },
            { type: 'tool_use', id: 't1', name: 'Read', input: { path: '/tmp' } }
          ],
          usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 200 }
        }
      } as RawAssistantEntry,
      {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: 'file data' }
          ] as RawContentBlock[]
        }
      } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'text', text: 'Done' }],
          usage: { input_tokens: 150, output_tokens: 30, cache_read_input_tokens: 250 }
        }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const oldResult = buildTurns(entries, buildToolResultMap(entries))
    const newResult = readSessionFromRaw(raw)

    expect(newResult.turns).toEqual(oldResult.turns)
    expect(newResult.tokens).toEqual(oldResult.tokens)
    expect(newResult.contextWindow).toEqual(oldResult.contextWindow)
  })

  it('should handle upToMessageId cutoff with tool_result collection', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Q1' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }],
          usage: { input_tokens: 50, output_tokens: 20 }
        }
      } as RawAssistantEntry,
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] as RawContentBlock[]
        }
      } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'text', text: 'A2' }],
          usage: { input_tokens: 100, output_tokens: 40 }
        }
      } as RawAssistantEntry,
      { type: 'user', message: { content: 'Q3' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a3',
        message: {
          content: [{ type: 'text', text: 'A3' }],
          usage: { input_tokens: 200, output_tokens: 80 }
        }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const result = readSessionFromRaw(raw, 'a2')

    expect(result.tokens.totalInput).toBe(150)
    expect(result.tokens.totalOutput).toBe(60)
    const texts = result.turns.filter((t) => t.assistantText).map((t) => t.assistantText)
    expect(texts).not.toContain('A3')
  })

  it('should handle consecutive assistant entries as a single group', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Go' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: {
          content: [{ type: 'thinking', thinking: 'hmm' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [{ type: 'text', text: 'Answer' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const result = readSessionFromRaw(raw)

    const assistantTurns = result.turns.filter((t) => t.assistantText)
    expect(assistantTurns).toHaveLength(1)
    expect(assistantTurns[0].assistantText).toBe('Answer')
    expect(assistantTurns[0].thinkingBlocks).toEqual(['hmm'])
  })

  it('should return empty for blank input', () => {
    const result = readSessionFromRaw('')
    expect(result.turns).toEqual([])
    expect(result.tokens.totalInput).toBe(0)
    expect(result.contextWindow).toBe(0)
  })
})

describe('extractAssistantTurnsFromRaw', () => {
  it('should extract text from assistant entries in JSONL', () => {
    const entries: RawEntry[] = [
      { type: 'user', message: { content: 'Hello' } } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'World' }] }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: { content: [{ type: 'text', text: 'Again' }] }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const result = extractAssistantTurnsFromRaw(raw)

    expect(result).toEqual([
      { uuid: 'a1', text: 'World' },
      { uuid: 'a2', text: 'Again' }
    ])
  })

  it('should skip thinking-only entries', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'thinking', thinking: 'internal' }] }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'a2',
        message: {
          content: [
            { type: 'thinking', thinking: 'step' },
            { type: 'text', text: 'visible' }
          ]
        }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const result = extractAssistantTurnsFromRaw(raw)

    expect(result).toEqual([{ uuid: 'a2', text: 'visible' }])
  })

  it('should skip entries with empty text', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] }
      } as RawAssistantEntry
    ]
    const raw = toJsonl(entries)

    const result = extractAssistantTurnsFromRaw(raw)

    expect(result).toEqual([])
  })

  it('should return empty for blank input', () => {
    expect(extractAssistantTurnsFromRaw('')).toEqual([])
  })
})

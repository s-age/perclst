import { describe, it, expect } from 'vitest'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry
} from '../claudeSessionParser'
import { buildTurns } from '../claudeSessionParser'

describe('buildTurns', () => {
  // Complexity: 9, suggested cases: 8

  it('should build turns from mixed user and assistant entries', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: { content: 'Hello' }
      } as RawUserEntry,
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: {
          content: [{ type: 'text', text: 'Hi there' }]
        }
      } as RawAssistantEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(2)
    expect(result.turns[0]).toEqual({ userMessage: 'Hello', toolCalls: [] })
    expect(result.turns[1].assistantText).toBe('Hi there')
  })

  it('should skip user entries with tool_result content blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'result text' }
          ] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(0)
  })

  it('should handle user entries with array content containing text blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' }
          ] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(1)
    expect(result.turns[0].userMessage).toBe('Part 1\nPart 2')
  })

  it('should skip user entries with empty text blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_reference', id: 'ref-1' }] as RawContentBlock[]
        }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(0)
  })

  it('should merge consecutive assistant entries into one logical turn', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: { content: [{ type: 'thinking', thinking: 'thought' }] }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'msg-2',
        message: { content: [{ type: 'text', text: 'I will read the file.' }] }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'msg-3',
        message: {
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: 'x.ts' } }]
        }
      } as RawAssistantEntry
    ]
    const toolResultMap = new Map([['tool-1', { text: 'contents', isError: false }]])

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(1)
    expect(result.turns[0].assistantText).toBe('I will read the file.')
    expect(result.turns[0].toolCalls).toHaveLength(1)
    expect(result.turns[0].toolCalls[0].name).toBe('Read')
    expect(result.turns[0].thinkingBlocks).toEqual(['thought'])
  })

  it('should accumulate token counts across consecutive assistant entries into one turn', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: {
          content: [{ type: 'text', text: 'Response 1' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        }
      } as RawAssistantEntry,
      {
        type: 'assistant',
        uuid: 'msg-2',
        message: {
          content: [{ type: 'text', text: 'Response 2' }],
          usage: { input_tokens: 80, output_tokens: 40 }
        }
      } as RawAssistantEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(1)
    expect(result.tokens).toEqual({
      totalInput: 180,
      totalOutput: 90,
      totalCacheRead: 0,
      totalCacheCreation: 0
    })
  })

  it('should start a new assistant turn after each user entry', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } }]
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
        uuid: 'msg-2',
        message: { content: [{ type: 'text', text: 'Done.' }] }
      } as RawAssistantEntry
    ]
    const toolResultMap = new Map([['t1', { text: 'ok', isError: false }]])

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(2)
    expect(result.turns[0].toolCalls[0].name).toBe('Bash')
    expect(result.turns[1].assistantText).toBe('Done.')
  })

  it('should skip assistant entries with only thinking blocks', () => {
    const entries: RawEntry[] = [
      {
        type: 'assistant',
        uuid: 'msg-1',
        message: {
          content: [{ type: 'thinking', thinking: 'internal thoughts' }]
        }
      } as RawAssistantEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(0)
  })

  it('should ignore unknown entry types', () => {
    const entries: RawEntry[] = [
      { type: 'unknown' } as RawEntry,
      {
        type: 'user',
        message: { content: 'Hello' }
      } as RawUserEntry
    ]
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(1)
    expect(result.turns[0].userMessage).toBe('Hello')
  })

  it('should handle empty entries array', () => {
    const entries: RawEntry[] = []
    const toolResultMap = new Map()

    const result = buildTurns(entries, toolResultMap)

    expect(result.turns).toHaveLength(0)
    expect(result.tokens).toEqual({
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreation: 0
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  buildToolResultMap,
  filterEntriesUpTo,
  processAssistantEntry
} from '../../claudeSessionParser'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry
} from '../../claudeSessionParser'

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

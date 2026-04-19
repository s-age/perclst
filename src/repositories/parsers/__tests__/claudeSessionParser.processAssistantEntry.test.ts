import { describe, it, expect } from 'vitest'
import type { RawAssistantEntry } from '../claudeSessionParser'
import { processAssistantEntry } from '../claudeSessionParser'

describe('processAssistantEntry', () => {
  // Complexity: 18, suggested cases: 8

  it('should return null when entry contains only thinking blocks', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [{ type: 'thinking', thinking: 'internal thoughts' }]
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result).toBeNull()
  })

  it('should extract thinking blocks and text from assistant message', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [
          { type: 'thinking', thinking: 'thought 1' },
          { type: 'text', text: 'Response text' },
          { type: 'thinking', thinking: 'thought 2' }
        ]
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result).not.toBeNull()
    expect(result?.turn.thinkingBlocks).toEqual(['thought 1', 'thought 2'])
    expect(result?.turn.assistantText).toBe('Response text')
    expect(result?.turn.toolCalls).toEqual([])
  })

  it('should extract tool calls with results from tool result map', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'WebFetch', input: { url: 'test.com' } },
          { type: 'tool_use', id: 'tool-2', name: 'Read', input: { file: 'test.txt' } }
        ]
      }
    }
    const toolResultMap = new Map([
      ['tool-1', { text: 'Fetched content', isError: false }],
      ['tool-2', { text: null, isError: true }]
    ])

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result).not.toBeNull()
    expect(result?.turn.toolCalls).toHaveLength(2)
    expect(result?.turn.toolCalls[0]).toEqual({
      name: 'WebFetch',
      input: { url: 'test.com' },
      result: 'Fetched content',
      isError: false
    })
    expect(result?.turn.toolCalls[1]).toEqual({
      name: 'Read',
      input: { file: 'test.txt' },
      result: null,
      isError: true
    })
  })

  it('should handle missing tool results with defaults', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [{ type: 'tool_use', id: 'tool-unknown', name: 'Bash', input: { command: 'ls' } }]
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result?.turn.toolCalls[0]).toEqual({
      name: 'Bash',
      input: { command: 'ls' },
      result: null,
      isError: false
    })
  })

  it('should accumulate text blocks with concatenation', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'second part' }
        ]
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result?.turn.assistantText).toBe('First partsecond part')
  })

  it('should handle usage tokens and build token deltas', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 10
        }
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result?.tokenDeltas).toEqual({
      totalInput: 100,
      totalOutput: 50,
      totalCacheRead: 20,
      totalCacheCreation: 10
    })
    expect(result?.turn.usage).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 20,
      cache_creation_input_tokens: 10
    })
  })

  it('should handle partial usage tokens with defaults', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result?.tokenDeltas).toEqual({
      totalInput: 100,
      totalOutput: 50,
      totalCacheRead: 0,
      totalCacheCreation: 0
    })
  })

  it('should return undefined for usage when not provided', () => {
    const entry: RawAssistantEntry = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        content: [{ type: 'text', text: 'Response' }]
      }
    }
    const toolResultMap = new Map()

    const result = processAssistantEntry(entry, toolResultMap)

    expect(result?.turn.usage).toBeUndefined()
    expect(result?.tokenDeltas).toEqual({
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreation: 0
    })
  })
})

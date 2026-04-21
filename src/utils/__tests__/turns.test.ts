import { describe, it, expect, beforeEach } from 'vitest'
import { flattenTurns, applyRowFilter } from '../turns.js'
import type { ClaudeCodeTurn, ToolCall } from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'

describe('flattenTurns', () => {
  describe('happy path — single turn with all components', () => {
    it('should flatten a complete turn with user message, thinking, tool calls, and assistant text', () => {
      const toolCall: ToolCall = {
        name: 'Read',
        input: { file_path: '/test.txt' },
        result: 'file contents here',
        isError: false
      }

      const turns: ClaudeCodeTurn[] = [
        {
          userMessage: 'Read the file',
          thinkingBlocks: ['Let me think about this'],
          toolCalls: [toolCall],
          assistantText: 'I read the file'
        }
      ]

      const result = flattenTurns(turns)

      expect(result).toEqual([
        { n: 1, role: 'user', content: 'Read the file' },
        { n: 2, role: 'thinking', content: 'Let me think about this' },
        { n: 3, role: 'tool_use', content: 'Read  {"file_path":"/test.txt"}' },
        { n: 4, role: 'tool_result', content: 'file contents here' },
        { n: 5, role: 'assistant', content: 'I read the file' }
      ])
    })
  })

  describe('empty input', () => {
    it('should return empty array for empty turns', () => {
      const result = flattenTurns([])
      expect(result).toEqual([])
    })
  })

  describe('userMessage branch', () => {
    it('should include userMessage when present', () => {
      const turns: ClaudeCodeTurn[] = [{ userMessage: 'Hello', toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({ n: 1, role: 'user', content: 'Hello' })
    })

    it('should skip userMessage when undefined', () => {
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result).not.toContainEqual(expect.objectContaining({ role: 'user' }))
    })
  })

  describe('thinkingBlocks branch', () => {
    it('should include first thinking block', () => {
      const turns: ClaudeCodeTurn[] = [
        {
          thinkingBlocks: ['First thought', 'Second thought'],
          toolCalls: []
        }
      ]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({ n: 1, role: 'thinking', content: 'First thought' })
    })

    it('should include second thinking block with incremented counter', () => {
      const turns: ClaudeCodeTurn[] = [
        {
          thinkingBlocks: ['First thought', 'Second thought'],
          toolCalls: []
        }
      ]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({ n: 2, role: 'thinking', content: 'Second thought' })
    })

    it('should handle empty thinkingBlocks array', () => {
      const turns: ClaudeCodeTurn[] = [{ thinkingBlocks: [], toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result.filter((r) => r.role === 'thinking')).toHaveLength(0)
    })

    it('should handle undefined thinkingBlocks with ?? operator', () => {
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result.filter((r) => r.role === 'thinking')).toHaveLength(0)
    })
  })

  describe('toolCalls branch', () => {
    it('should include tool call with stringified input', () => {
      const toolCall: ToolCall = {
        name: 'Bash',
        input: { command: 'ls -la' },
        result: null,
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({
        n: 1,
        role: 'tool_use',
        content: 'Bash  {"command":"ls -la"}'
      })
    })

    it('should include first tool call', () => {
      const toolCalls: ToolCall[] = [
        { name: 'Read', input: { file_path: '/a' }, result: 'a content', isError: false },
        { name: 'Bash', input: { command: 'echo' }, result: 'output', isError: false }
      ]
      const turns: ClaudeCodeTurn[] = [{ toolCalls }]
      const result = flattenTurns(turns)
      expect(result[0]).toEqual({ n: 1, role: 'tool_use', content: 'Read  {"file_path":"/a"}' })
    })

    it('should include second tool call with incremented counter after result', () => {
      const toolCalls: ToolCall[] = [
        { name: 'Read', input: { file_path: '/a' }, result: 'a content', isError: false },
        { name: 'Bash', input: { command: 'echo' }, result: 'output', isError: false }
      ]
      const turns: ClaudeCodeTurn[] = [{ toolCalls }]
      const result = flattenTurns(turns)
      expect(result[2]).toEqual({ n: 3, role: 'tool_use', content: 'Bash  {"command":"echo"}' })
    })

    it('should skip tool_result row when result is null', () => {
      const toolCall: ToolCall = {
        name: 'ToolSearch',
        input: {},
        result: null,
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      expect(result.filter((r) => r.role === 'tool_result')).toHaveLength(0)
    })

    it('should include tool_result row when result is not null', () => {
      const toolCall: ToolCall = {
        name: 'Read',
        input: { file_path: '/test' },
        result: 'file content',
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({ n: 2, role: 'tool_result', content: 'file content' })
    })

    it('should include tool_result even when isError is true', () => {
      const toolCall: ToolCall = {
        name: 'Bash',
        input: { command: 'false' },
        result: 'Error: command failed',
        isError: true
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({
        n: 2,
        role: 'tool_result',
        content: 'Error: command failed'
      })
    })
  })

  describe('assistantText branch', () => {
    it('should include assistantText when present', () => {
      const turns: ClaudeCodeTurn[] = [{ assistantText: 'Here is my response', toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result).toContainEqual({ n: 1, role: 'assistant', content: 'Here is my response' })
    })

    it('should skip assistantText when undefined', () => {
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [] }]
      const result = flattenTurns(turns)
      expect(result).not.toContainEqual(expect.objectContaining({ role: 'assistant' }))
    })
  })

  describe('row counter incrementing', () => {
    it('should increment row counter across multiple turns', () => {
      const turns: ClaudeCodeTurn[] = [
        { userMessage: 'First', toolCalls: [] },
        { userMessage: 'Second', toolCalls: [] },
        { userMessage: 'Third', toolCalls: [] }
      ]
      const result = flattenTurns(turns)
      expect(result.map((r) => r.n)).toEqual([1, 2, 3])
    })

    it('should maintain sequential counter through complex turn', () => {
      const toolCall: ToolCall = {
        name: 'Test',
        input: {},
        result: 'ok',
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [
        {
          userMessage: 'msg',
          thinkingBlocks: ['a', 'b'],
          toolCalls: [toolCall],
          assistantText: 'reply'
        }
      ]
      const result = flattenTurns(turns)
      const counters = result.map((r) => r.n)
      expect(counters).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('tool input serialization', () => {
    it('should correctly stringify complex input object', () => {
      const toolCall: ToolCall = {
        name: 'WebFetch',
        input: {
          url: 'https://example.com',
          prompt: 'summarize this',
          nested: { key: 'value', count: 42 }
        },
        result: null,
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      const toolRow = result[0]
      expect(toolRow.content).toContain('WebFetch')
      expect(toolRow.content).toContain('https://example.com')
      expect(toolRow.content).toContain('summarize this')
    })

    it('should handle empty input object', () => {
      const toolCall: ToolCall = {
        name: 'Tool',
        input: {},
        result: null,
        isError: false
      }
      const turns: ClaudeCodeTurn[] = [{ toolCalls: [toolCall] }]
      const result = flattenTurns(turns)
      expect(result[0].content).toBe('Tool  {}')
    })
  })
})

describe('applyRowFilter', () => {
  let sampleRows: TurnRow[]

  beforeEach(() => {
    sampleRows = [
      { n: 1, role: 'user', content: 'first' },
      { n: 2, role: 'thinking', content: 'second' },
      { n: 3, role: 'tool_use', content: 'third' },
      { n: 4, role: 'tool_result', content: 'fourth' },
      { n: 5, role: 'assistant', content: 'fifth' }
    ]
  })

  describe('happy path — no filters', () => {
    it('should return same array contents when filter is empty object', () => {
      const filter: RowFilter = {}
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should return same array reference when no filters applied', () => {
      const filter: RowFilter = {}
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toBe(sampleRows)
    })
  })

  describe('empty rows input', () => {
    it('should return empty array for empty rows', () => {
      const result = applyRowFilter([], {})
      expect(result).toEqual([])
    })

    it('should return empty array for empty rows with filters', () => {
      const result = applyRowFilter([], { head: 3, tail: 2, order: 'desc' })
      expect(result).toEqual([])
    })
  })

  describe('tail filter branch', () => {
    it('should return last N rows when tail is defined', () => {
      const filter: RowFilter = { tail: 2 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 4, role: 'tool_result', content: 'fourth' },
        { n: 5, role: 'assistant', content: 'fifth' }
      ])
    })

    it('should return all rows when tail exceeds array length', () => {
      const filter: RowFilter = { tail: 10 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should return all rows when tail is 0 (JavaScript slice quirk)', () => {
      const filter: RowFilter = { tail: 0 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should not apply tail when tail is undefined', () => {
      const filter: RowFilter = { tail: undefined }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })
  })

  describe('head filter branch', () => {
    it('should return first N rows when head is defined', () => {
      const filter: RowFilter = { head: 2 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 1, role: 'user', content: 'first' },
        { n: 2, role: 'thinking', content: 'second' }
      ])
    })

    it('should return all rows when head exceeds array length', () => {
      const filter: RowFilter = { head: 10 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should return empty array when head is 0', () => {
      const filter: RowFilter = { head: 0 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([])
    })

    it('should not apply head when head is undefined', () => {
      const filter: RowFilter = { head: undefined }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })
  })

  describe('order filter branch', () => {
    it('should reverse array when order is desc', () => {
      const filter: RowFilter = { order: 'desc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 5, role: 'assistant', content: 'fifth' },
        { n: 4, role: 'tool_result', content: 'fourth' },
        { n: 3, role: 'tool_use', content: 'third' },
        { n: 2, role: 'thinking', content: 'second' },
        { n: 1, role: 'user', content: 'first' }
      ])
    })

    it('should not reverse array when order is asc', () => {
      const filter: RowFilter = { order: 'asc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should not reverse array when order is undefined', () => {
      const filter: RowFilter = { order: undefined }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows)
    })

    it('should create new array when reversing with desc order', () => {
      const filter: RowFilter = { order: 'desc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).not.toBe(sampleRows)
    })
  })

  describe('filter combination — tail then head', () => {
    it('should apply tail first, then head', () => {
      const filter: RowFilter = { tail: 4, head: 2 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 2, role: 'thinking', content: 'second' },
        { n: 3, role: 'tool_use', content: 'third' }
      ])
    })

    it('should handle tail then head with no overlap', () => {
      const filter: RowFilter = { tail: 1, head: 1 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([{ n: 5, role: 'assistant', content: 'fifth' }])
    })
  })

  describe('filter combination — all three filters', () => {
    it('should apply tail, head, then reverse in order', () => {
      const filter: RowFilter = { tail: 4, head: 3, order: 'desc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 4, role: 'tool_result', content: 'fourth' },
        { n: 3, role: 'tool_use', content: 'third' },
        { n: 2, role: 'thinking', content: 'second' }
      ])
    })

    it('should handle all filters with single row result', () => {
      const filter: RowFilter = { tail: 3, head: 1, order: 'desc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([{ n: 3, role: 'tool_use', content: 'third' }])
    })
  })

  describe('array immutability', () => {
    it('should not mutate original array when applying filters', () => {
      const original = [...sampleRows]
      const filter: RowFilter = { order: 'desc' }
      applyRowFilter(sampleRows, filter)
      expect(sampleRows).toEqual(original)
    })

    it('should create new array when reversing', () => {
      const filter: RowFilter = { order: 'desc' }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).not.toBe(sampleRows)
    })

    it('should return correctly filtered array with tail filter', () => {
      const filter: RowFilter = { tail: 2 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual([
        { n: 4, role: 'tool_result', content: 'fourth' },
        { n: 5, role: 'assistant', content: 'fifth' }
      ])
    })
  })

  describe('edge cases', () => {
    it('should handle single-row array with all filters', () => {
      const rows = [{ n: 1, role: 'user', content: 'only' }]
      const filter: RowFilter = { head: 1, tail: 1, order: 'desc' }
      const result = applyRowFilter(rows, filter)
      expect(result).toEqual([{ n: 1, role: 'user', content: 'only' }])
    })

    it('should handle filter with tail larger than array then head', () => {
      const filter: RowFilter = { tail: 100, head: 2 }
      const result = applyRowFilter(sampleRows, filter)
      expect(result).toEqual(sampleRows.slice(0, 2))
    })
  })
})

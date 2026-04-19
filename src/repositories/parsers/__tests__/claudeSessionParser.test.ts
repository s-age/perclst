import { describe, it, expect } from 'vitest'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry
} from '../claudeSessionParser'
import { parseRawEntries, buildToolResultMap, filterEntriesUpTo } from '../claudeSessionParser'

describe('claudeSessionParser', () => {
  describe('buildToolResultMap', () => {
    // Complexity: 7, suggested cases: 5

    it('should extract tool_result blocks from user entries into a map', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                content: 'Result text',
                is_error: false
              }
            ] as RawContentBlock[]
          }
        } as RawUserEntry
      ]

      const result = buildToolResultMap(entries)

      expect(result.size).toBe(1)
      expect(result.get('tool-1')).toEqual({ text: 'Result text', isError: false })
    })

    it('should handle multiple tool results in a single user entry', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                content: 'Result 1',
                is_error: false
              },
              {
                type: 'tool_result',
                tool_use_id: 'tool-2',
                content: 'Result 2',
                is_error: true
              }
            ] as RawContentBlock[]
          }
        } as RawUserEntry
      ]

      const result = buildToolResultMap(entries)

      expect(result.size).toBe(2)
      expect(result.get('tool-1')).toEqual({ text: 'Result 1', isError: false })
      expect(result.get('tool-2')).toEqual({ text: 'Result 2', isError: true })
    })

    it('should handle tool results with complex content blocks', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                content: [
                  { type: 'text', text: 'Line 1' },
                  { type: 'text', text: 'Line 2' }
                ] as RawContentBlock[],
                is_error: false
              }
            ] as RawContentBlock[]
          }
        } as RawUserEntry
      ]

      const result = buildToolResultMap(entries)

      expect(result.get('tool-1')).toEqual({
        text: 'Line 1\nLine 2',
        isError: false
      })
    })

    it('should treat missing is_error as false', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                content: 'Result text'
              }
            ] as RawContentBlock[]
          }
        } as RawUserEntry
      ]

      const result = buildToolResultMap(entries)

      expect(result.get('tool-1')?.isError).toBe(false)
    })

    it('should ignore assistant entries and return empty map for no tool results', () => {
      const entries: RawEntry[] = [
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry,
        {
          type: 'user',
          message: { content: 'Plain text' }
        } as RawUserEntry,
        {
          type: 'unknown'
        } as RawEntry
      ]

      const result = buildToolResultMap(entries)

      expect(result.size).toBe(0)
    })
  })

  describe('filterEntriesUpTo', () => {
    // Complexity: 7, suggested cases: 4

    it('should return all entries when message ID is not found', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: { content: 'Hello' }
        } as RawUserEntry,
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry
      ]

      const result = filterEntriesUpTo(entries, 'nonexistent-id')

      expect(result).toEqual(entries)
    })

    it('should include assistant message and stop at cutoff', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: { content: 'Hello' }
        } as RawUserEntry,
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry,
        {
          type: 'user',
          message: { content: 'Follow up' }
        } as RawUserEntry
      ]

      const result = filterEntriesUpTo(entries, 'msg-1')

      expect(result).toHaveLength(2)
      expect((result[0] as RawUserEntry).message.content).toBe('Hello')
      expect((result[1] as RawAssistantEntry).uuid).toBe('msg-1')
    })

    it('should include tool_result user entry following assistant message', () => {
      const entries: RawEntry[] = [
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry,
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                content: 'Result'
              }
            ] as RawContentBlock[]
          }
        } as RawUserEntry,
        {
          type: 'user',
          message: { content: 'Another message' }
        } as RawUserEntry
      ]

      const result = filterEntriesUpTo(entries, 'msg-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(entries[0])
      expect(result[1]).toEqual(entries[1])
    })

    it('should not include user entry when it does not contain tool results', () => {
      const entries: RawEntry[] = [
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry,
        {
          type: 'user',
          message: {
            content: [{ type: 'text', text: 'Just text' }] as RawContentBlock[]
          }
        } as RawUserEntry,
        {
          type: 'user',
          message: { content: 'Another message' }
        } as RawUserEntry
      ]

      const result = filterEntriesUpTo(entries, 'msg-1')

      expect(result).toHaveLength(1)
      expect((result[0] as RawAssistantEntry).uuid).toBe('msg-1')
    })

    it('should handle assistant message at end of entries', () => {
      const entries: RawEntry[] = [
        {
          type: 'user',
          message: { content: 'Hello' }
        } as RawUserEntry,
        {
          type: 'assistant',
          uuid: 'msg-1',
          message: { content: [] }
        } as RawAssistantEntry
      ]

      const result = filterEntriesUpTo(entries, 'msg-1')

      expect(result).toHaveLength(2)
      expect(result).toEqual(entries)
    })
  })

  describe('parseRawEntries', () => {
    // Complexity: 1, suggested cases: 1

    it('should parse JSON lines and return RawEntry array', () => {
      const raw = `{"type":"user","message":{"content":"Hello"}}
{"type":"assistant","uuid":"msg-1","message":{"content":[]}}
{"type":"user","message":{"content":"Goodbye"}}`

      const result = parseRawEntries(raw)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        type: 'user',
        message: { content: 'Hello' }
      })
      expect(result[1]).toEqual({
        type: 'assistant',
        uuid: 'msg-1',
        message: { content: [] }
      })
      expect(result[2]).toEqual({
        type: 'user',
        message: { content: 'Goodbye' }
      })
    })

    it('should handle empty input', () => {
      const raw = ''

      const result = parseRawEntries(raw)

      expect(result).toEqual([])
    })

    it('should filter out empty lines and parse remaining entries', () => {
      const raw = `{"type":"user","message":{"content":"Hello"}}

{"type":"assistant","uuid":"msg-1","message":{"content":[]}}`

      const result = parseRawEntries(raw)

      expect(result).toHaveLength(2)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { readSessionFromRaw, extractAssistantTurnsFromRaw } from '../claudeSessionScanner'

describe('claudeSessionScanner', () => {
  describe('readSessionFromRaw', () => {
    it('should parse a basic user+assistant conversation', () => {
      const raw = [
        JSON.stringify({
          type: 'user',
          message: { content: 'Hello' }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a1',
          message: {
            content: [{ type: 'text', text: 'Hi there' }],
            usage: { input_tokens: 10, output_tokens: 5 }
          }
        })
      ].join('\n')

      const result = readSessionFromRaw(raw)

      expect(result.turns).toHaveLength(2)
      expect(result.turns[0].userMessage).toBe('Hello')
      expect(result.turns[1].assistantText).toBe('Hi there')
      expect(result.tokens.totalInput).toBe(10)
      expect(result.tokens.totalOutput).toBe(5)
    })

    it('should resolve tool results from subsequent user entries', () => {
      const raw = [
        JSON.stringify({
          type: 'user',
          message: { content: 'Do something' }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a1',
          message: {
            content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { path: '/tmp' } }],
            usage: { input_tokens: 10, output_tokens: 5 }
          }
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'tool_result', tool_use_id: 't1', content: 'file contents' }]
          }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a2',
          message: {
            content: [{ type: 'text', text: 'Done' }],
            usage: { input_tokens: 20, output_tokens: 10 }
          }
        })
      ].join('\n')

      const result = readSessionFromRaw(raw)

      const toolTurn = result.turns.find((t) => t.toolCalls.length > 0)
      expect(toolTurn?.toolCalls[0].result).toBe('file contents')
    })

    it('should stop at upToMessageId cutoff', () => {
      const raw = [
        JSON.stringify({
          type: 'user',
          message: { content: 'Q1' }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a1',
          message: {
            content: [{ type: 'text', text: 'A1' }],
            usage: { input_tokens: 10, output_tokens: 5 }
          }
        }),
        JSON.stringify({
          type: 'user',
          message: { content: 'Q2' }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a2',
          message: {
            content: [{ type: 'text', text: 'A2' }],
            usage: { input_tokens: 20, output_tokens: 10 }
          }
        })
      ].join('\n')

      const result = readSessionFromRaw(raw, 'a1')

      expect(result.turns).toHaveLength(2)
      expect(result.turns[0].userMessage).toBe('Q1')
      expect(result.turns[1].assistantText).toBe('A1')
      expect(result.tokens.totalInput).toBe(10)
    })

    it('should return empty turns and zero tokens for empty input', () => {
      const result = readSessionFromRaw('')

      expect(result.turns).toEqual([])
      expect(result.tokens.totalInput).toBe(0)
      expect(result.contextWindow).toBe(0)
    })
  })

  describe('extractAssistantTurnsFromRaw', () => {
    it('should extract text from assistant entries', () => {
      const raw = [
        JSON.stringify({
          type: 'user',
          message: { content: 'Hello' }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a1',
          message: { content: [{ type: 'text', text: 'Hi there' }] }
        })
      ].join('\n')

      const result = extractAssistantTurnsFromRaw(raw)

      expect(result).toEqual([{ uuid: 'a1', text: 'Hi there' }])
    })

    it('should skip thinking-only assistant entries', () => {
      const raw = JSON.stringify({
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'thinking', thinking: 'hmm' }] }
      })

      const result = extractAssistantTurnsFromRaw(raw)

      expect(result).toEqual([])
    })

    it('should skip assistant entries with empty text after trimming', () => {
      const raw = JSON.stringify({
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: '   ' }] }
      })

      const result = extractAssistantTurnsFromRaw(raw)

      expect(result).toEqual([])
    })

    it('should return empty array for empty input', () => {
      expect(extractAssistantTurnsFromRaw('')).toEqual([])
    })
  })
})

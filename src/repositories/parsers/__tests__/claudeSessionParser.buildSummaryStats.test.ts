import { describe, it, expect } from 'vitest'
import { buildSummaryStats } from '../claudeSessionParser'

describe('buildSummaryStats', () => {
  // Complexity: 6, suggested cases: 4

  it('should count user instructions, tool uses, and assistant responses', () => {
    const turns = [
      { userMessage: 'Instruction 1', toolCalls: [] },
      {
        assistantText: 'Response',
        toolCalls: [
          { name: 'Tool1', input: {}, result: null, isError: false },
          { name: 'Tool2', input: {}, result: null, isError: false }
        ]
      }
    ]

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown.userInstructions).toBe(1)
    expect(result.turnsBreakdown.assistantResponse).toBe(1)
    expect(result.turnsBreakdown.toolUse).toBe(2)
    expect(result.turnsBreakdown.total).toBe(1 + 2 * 2 + 1) // userInstructions + toolUse*2 + assistantResponse
  })

  it('should collect all tool uses with metadata', () => {
    const turns = [
      {
        userMessage: 'Instruction',
        toolCalls: [
          {
            name: 'WebFetch',
            input: { url: 'example.com' },
            result: null,
            isError: false
          },
          {
            name: 'Bash',
            input: { command: 'ls -la' },
            result: null,
            isError: true
          }
        ]
      }
    ]

    const result = buildSummaryStats(turns)

    expect(result.toolUses).toHaveLength(2)
    expect(result.toolUses[0]).toEqual({
      name: 'WebFetch',
      input: { url: 'example.com' },
      isError: false
    })
    expect(result.toolUses[1]).toEqual({
      name: 'Bash',
      input: { command: 'ls -la' },
      isError: true
    })
  })

  it('should handle assistant response with tool calls but no text', () => {
    const turns = [
      {
        toolCalls: [{ name: 'Tool1', input: {}, result: null, isError: false }]
      }
    ]

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown.assistantResponse).toBe(1)
    expect(result.turnsBreakdown.toolUse).toBe(1)
  })

  it('should handle empty turns array', () => {
    const turns = []

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown).toEqual({
      userInstructions: 0,
      toolUse: 0,
      assistantResponse: 0,
      total: 0
    })
    expect(result.toolUses).toEqual([])
  })
})

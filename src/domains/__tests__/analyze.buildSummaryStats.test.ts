import { describe, it, expect } from 'vitest'
import { buildSummaryStats } from '../analyze'

describe('buildSummaryStats', () => {
  it('should count user instructions, API calls, tool calls/results', () => {
    const turns = [
      { userMessage: 'Instruction', toolCalls: [] },
      {
        toolCalls: [
          { name: 'Tool1', input: {}, result: null, isError: false },
          { name: 'Tool2', input: {}, result: null, isError: false }
        ]
      },
      { assistantText: 'Final answer', toolCalls: [] }
    ]

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown.userInstructions).toBe(1)
    expect(result.turnsBreakdown.apiCalls).toBe(2)
    expect(result.turnsBreakdown.toolCalls).toBe(2)
    expect(result.turnsBreakdown.toolResults).toBe(2)
    expect(result.turnsBreakdown.total).toBe(1 + 2 + 2 + 2) // 7
  })

  it('should count parallel tool calls as one API call', () => {
    const turns = [
      { toolCalls: [{ name: 'A', input: {}, result: null, isError: false }] },
      {
        toolCalls: [
          { name: 'B', input: {}, result: null, isError: false },
          { name: 'C', input: {}, result: null, isError: false }
        ]
      },
      { assistantText: 'Done', toolCalls: [] }
    ]

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown.apiCalls).toBe(3)
    expect(result.turnsBreakdown.toolCalls).toBe(3)
    expect(result.turnsBreakdown.toolResults).toBe(3)
    expect(result.turnsBreakdown.total).toBe(3 + 3 + 3) // 9
  })

  it('should collect all tool uses with metadata', () => {
    const turns = [
      {
        toolCalls: [
          { name: 'WebFetch', input: { url: 'example.com' }, result: null, isError: false },
          { name: 'Bash', input: { command: 'ls -la' }, result: null, isError: true }
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

  it('should count tool-calling turns as API calls', () => {
    const turns = [{ toolCalls: [{ name: 'Tool1', input: {}, result: null, isError: false }] }]

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown.apiCalls).toBe(1)
  })

  it('should handle empty turns array', () => {
    const turns: never[] = []

    const result = buildSummaryStats(turns)

    expect(result.turnsBreakdown).toEqual({
      userInstructions: 0,
      apiCalls: 0,
      toolCalls: 0,
      toolResults: 0,
      total: 0
    })
    expect(result.toolUses).toEqual([])
  })
})

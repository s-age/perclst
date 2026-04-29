import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { SessionSummaryRow } from '@src/types/analysis'

const mockPrint = vi.fn()
vi.mock('@src/utils/output', () => ({
  stdout: { print: (...args: unknown[]): void => mockPrint(...args) }
}))

import { printSummarizeJson, printSummarizeTable } from '../summarizeDisplay'

function makeRow(overrides: Partial<SessionSummaryRow> = {}): SessionSummaryRow {
  return {
    name: 'test-session',
    id: 'sess-001',
    apiCalls: 5,
    toolCalls: 3,
    tokens: {
      totalInput: 10000,
      totalOutput: 2000,
      totalCacheRead: 5000,
      totalCacheCreation: 3000,
      contextWindow: 18000
    },
    ...overrides
  }
}

describe('printSummarizeJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should output pretty-printed JSON for a single row', () => {
    const rows = [makeRow()]
    printSummarizeJson(rows)
    const output = mockPrint.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(rows)
  })

  it('should output an empty array when given no rows', () => {
    printSummarizeJson([])
    const output = mockPrint.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual([])
  })

  it('should output all rows when given multiple rows', () => {
    const rows = [makeRow({ name: 'a', id: '1' }), makeRow({ name: 'b', id: '2' })]
    printSummarizeJson(rows)
    const output = mockPrint.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(rows)
  })

  it('should use 2-space indentation', () => {
    const rows = [makeRow()]
    printSummarizeJson(rows)
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toBe(JSON.stringify(rows, null, 2))
  })
})

describe('printSummarizeTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include column headers', () => {
    printSummarizeTable([makeRow()])
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('Name')
    expect(output).toContain('API Calls')
    expect(output).toContain('Tool Calls')
    expect(output).toContain('Tokens In')
    expect(output).toContain('Cache Read')
    expect(output).toContain('Cache Creation')
    expect(output).toContain('Tokens Out')
    expect(output).toContain('Context Window')
  })

  it('should include the session name in the output', () => {
    printSummarizeTable([makeRow({ name: 'my-session' })])
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('my-session')
  })

  it('should include numeric api and tool call counts', () => {
    printSummarizeTable([makeRow({ apiCalls: 12, toolCalls: 7 })])
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('12')
    expect(output).toContain('7')
  })

  it('should format token values using formatKilo', () => {
    printSummarizeTable([
      makeRow({
        tokens: {
          totalInput: 56337,
          totalOutput: 12345,
          totalCacheRead: 99999,
          totalCacheCreation: 0,
          contextWindow: 128000
        }
      })
    ])
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('56.3k')
    expect(output).toContain('12.3k')
    expect(output).toContain('99.9k')
    expect(output).toContain('0.0k')
    expect(output).toContain('128.0k')
  })

  it('should render multiple rows', () => {
    const rows = [makeRow({ name: 'first', apiCalls: 1 }), makeRow({ name: 'second', apiCalls: 2 })]
    printSummarizeTable(rows)
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('first')
    expect(output).toContain('second')
  })

  it('should render only headers when given an empty array', () => {
    printSummarizeTable([])
    const output = mockPrint.mock.calls[0][0] as string
    expect(output).toContain('Name')
    expect(output).not.toContain('test-session')
  })
})

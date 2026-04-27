import Table from 'cli-table3'
import type { SessionSummaryRow } from '@src/types/analysis'
import { stdout } from '@src/utils/output'
import { formatKilo } from '@src/utils/token'

export function printSummarizeJson(rows: SessionSummaryRow[]): void {
  stdout.print(JSON.stringify(rows, null, 2))
}

export function printSummarizeTable(rows: SessionSummaryRow[]): void {
  const table = new Table({
    head: [
      'Name',
      'API Calls',
      'Tool Calls',
      'Tokens In',
      'Cache Read',
      'Cache Creation',
      'Tokens Out',
      'Context Window'
    ],
    style: { head: [], border: [] }
  })

  for (const row of rows) {
    table.push([
      row.name,
      row.apiCalls,
      row.toolCalls,
      formatKilo(row.tokens.totalInput),
      formatKilo(row.tokens.totalCacheRead),
      formatKilo(row.tokens.totalCacheCreation),
      formatKilo(row.tokens.totalOutput),
      formatKilo(row.tokens.contextWindow)
    ])
  }

  stdout.print(table.toString())
}

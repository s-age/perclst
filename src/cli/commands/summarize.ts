import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { parseSummarizeSessions } from '@src/validators/cli/summarizeSessions'
import { formatKilo } from '@src/utils/token'

type RawSummarizeOptions = {
  label?: string
  like?: string
  format?: string
}

export async function summarizeCommand(options: RawSummarizeOptions): Promise<void> {
  try {
    const input = parseSummarizeSessions(options)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const rows = await analyzeService.summarize({ label: input.label, like: input.like })

    if (input.format === 'json') {
      stdout.print(JSON.stringify(rows, null, 2))
      return
    }

    if (rows.length === 0) {
      stdout.print('No sessions found')
      return
    }

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
  } catch (error) {
    stderr.print('Failed to summarize sessions', error as Error)
    process.exit(1)
  }
}

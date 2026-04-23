import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { parseSummarizeSessions } from '@src/validators/cli/summarizeSessions'

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

    if (rows.length === 0) {
      stdout.print('No sessions found')
      return
    }

    if (input.format === 'json') {
      stdout.print(JSON.stringify(rows, null, 2))
      return
    }

    const table = new Table({
      head: [
        'Name',
        'Turns',
        'Tool Calls',
        'Tokens In',
        'Tokens Out',
        'Cache Read',
        'Cache Creation'
      ],
      style: { head: [], border: [] }
    })

    for (const row of rows) {
      table.push([
        row.name,
        row.turns,
        row.toolCalls,
        row.tokens.totalInput.toLocaleString(),
        row.tokens.totalOutput.toLocaleString(),
        row.tokens.totalCacheRead.toLocaleString(),
        row.tokens.totalCacheCreation.toLocaleString()
      ])
    }

    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to summarize sessions', error as Error)
    process.exit(1)
  }
}

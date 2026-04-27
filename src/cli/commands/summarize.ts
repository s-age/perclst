import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { parseSummarizeSessions } from '@src/validators/cli/summarizeSessions'
import { printSummarizeJson, printSummarizeTable } from '@src/cli/view/summarizeDisplay'

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
      printSummarizeJson(rows)
      return
    }

    if (rows.length === 0) {
      stdout.print('No sessions found')
      return
    }

    printSummarizeTable(rows)
  } catch (error) {
    stderr.print('Failed to summarize sessions', error as Error)
    process.exit(1)
  }
}

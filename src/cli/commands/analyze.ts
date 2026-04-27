import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import type { SessionService } from '@src/services/sessionService'
import { stderr } from '@src/utils/output'
import { parseAnalyzeSession } from '@src/validators/cli/analyzeSession'
import {
  printAnalyzeJson,
  printAnalyzeText,
  printAnalyzeDetail
} from '@src/cli/view/analyzeDisplay'

type RawAnalyzeOptions = {
  format?: string
  printDetail?: boolean
}

export async function analyzeCommand(sessionId: string, options: RawAnalyzeOptions): Promise<void> {
  try {
    const input = parseAnalyzeSession({ sessionId, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const { session, summary } = await analyzeService.analyze(resolvedId)

    if (input.format === 'json') {
      printAnalyzeJson(session, summary, input.printDetail ?? false)
      return
    }

    printAnalyzeText(session, summary)
    if (input.printDetail) {
      printAnalyzeDetail(summary.turns)
    }
  } catch (error) {
    stderr.print('Failed to analyze session', error as Error)
    process.exit(1)
  }
}

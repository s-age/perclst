import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { parseShowSession } from '@src/validators/cli/showSession'
import { printShowText, printTurnsTable } from '@src/cli/view/showDisplay'

type RawShowOptions = {
  format?: string
  order?: string
  head?: string
  tail?: string
  length?: string
}

export async function showCommand(sessionId: string, options: RawShowOptions): Promise<void> {
  try {
    const input = parseShowSession({ sessionId, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.get(resolvedId)

    if (input.format === 'json') {
      const { summary } = await analyzeService.analyze(resolvedId)
      stdout.print(JSON.stringify({ ...session, turns: summary.turns }, null, 2))
      return
    }

    printShowText(session)

    const { summary } = await analyzeService.analyze(resolvedId)
    const rows = analyzeService.formatTurns(summary.turns, {
      head: input.head,
      tail: input.tail,
      order: input.order
    })

    if (rows.length === 0) {
      stdout.print(`\n(no turns)`)
      return
    }

    stdout.print('')
    printTurnsTable(rows, input.length)
  } catch (error) {
    stderr.print('Failed to show session', error as Error)
    process.exit(1)
  }
}

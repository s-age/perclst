import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { parseRewindSession } from '@src/validators/cli/rewindSession'
import { printRewindList } from '@src/cli/view/rewindDisplay'

const DEFAULT_LENGTH = 120

type RawRewindOptions = {
  list?: boolean
  length?: string
}

export async function rewindCommand(
  sessionId: string | undefined,
  indexStr: string | undefined,
  options: RawRewindOptions
): Promise<void> {
  try {
    const input = parseRewindSession({
      sessionId,
      index: indexStr,
      list: options.list,
      length: options.length
    })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const resolvedId = await sessionService.resolveId(input.sessionId)

    if (input.list) {
      const turns = await analyzeService.getRewindTurns(resolvedId)
      if (turns.length === 0) {
        stdout.print('No assistant turns found.')
        return
      }
      printRewindList(turns, input.length ?? DEFAULT_LENGTH)
      return
    }

    if (input.index === undefined) {
      stderr.print('Either --list or an index argument is required')
      process.exit(1)
    }

    const messageId = await analyzeService.resolveTurnByIndex(resolvedId, input.index)
    const newSession = await sessionService.createRewindSession(resolvedId, messageId)

    stdout.print(`\nRewind session created: ${newSession.id}`)
    stdout.print(`To continue: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RangeError) {
      stderr.print(error.message)
    } else {
      stderr.print('Failed to rewind session', error as Error)
    }
    process.exit(1)
  }
}

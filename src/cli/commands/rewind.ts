import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AnalyzeService } from '@src/services/analyzeService'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'
import { ValidationError } from '@src/errors/validationError'
import { parseRewindSession } from '@src/validators/cli/rewindSession'

const DEFAULT_LENGTH = 120

type RawRewindOptions = {
  list?: boolean
  length?: string
}

export async function rewindCommand(
  sessionId: string | undefined,
  indexStr: string | undefined,
  options: RawRewindOptions
) {
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
        logger.print('No assistant turns found.')
        return
      }

      const displayLength = input.length ?? DEFAULT_LENGTH
      for (const turn of turns) {
        const preview =
          turn.text.length > displayLength ? turn.text.slice(0, displayLength) + '…' : turn.text
        logger.print(`  ${turn.index}: ${preview}`)
      }
      return
    }

    if (input.index === undefined) {
      logger.error('Either --list or an index argument is required')
      process.exit(1)
    }

    let messageId: string | undefined
    if (input.index > 0) {
      const turns = await analyzeService.getRewindTurns(resolvedId)
      const turn = turns[input.index]
      if (!turn) {
        logger.error(
          `Index ${input.index} is out of range (session has ${turns.length} assistant turns)`
        )
        process.exit(1)
      }
      messageId = turn.uuid
    }

    const newSession = await sessionService.createRewindSession(resolvedId, messageId)

    logger.print(`\nRewind session created: ${newSession.id}`)
    logger.print(`To continue: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error(`Invalid arguments: ${error.message}`)
    } else {
      logger.error('Failed to rewind session', error as Error)
    }
    process.exit(1)
  }
}

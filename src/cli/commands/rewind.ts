import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AnalyzeService } from '@src/services/analyzeService'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { parseRewindSession } from '@src/validators/cli/rewindSession'

const DEFAULT_LENGTH = 120

type RawRewindOptions = {
  list?: boolean
  length?: string
}

async function handleListMode(
  analyzeService: AnalyzeService,
  resolvedId: string,
  displayLength: number
): Promise<void> {
  const turns = await analyzeService.getRewindTurns(resolvedId)
  if (turns.length === 0) {
    stdout.print('No assistant turns found.')
    return
  }
  for (const turn of turns) {
    const preview =
      turn.text.length > displayLength ? turn.text.slice(0, displayLength) + '…' : turn.text
    stdout.print(`  ${turn.index}: ${preview}`)
  }
}

async function resolveMessageId(
  analyzeService: AnalyzeService,
  resolvedId: string,
  index: number
): Promise<string | undefined> {
  if (index === 0) return undefined
  const turns = await analyzeService.getRewindTurns(resolvedId)
  const turn = turns[index]
  if (!turn) {
    stderr.print(`Index ${index} is out of range (session has ${turns.length} assistant turns)`)
    process.exit(1)
  }
  return turn.uuid
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
      await handleListMode(analyzeService, resolvedId, input.length ?? DEFAULT_LENGTH)
      return
    }

    if (input.index === undefined) {
      stderr.print('Either --list or an index argument is required')
      process.exit(1)
    }

    const messageId = await resolveMessageId(analyzeService, resolvedId, input.index)
    const newSession = await sessionService.createRewindSession(resolvedId, messageId)

    stdout.print(`\nRewind session created: ${newSession.id}`)
    stdout.print(`To continue: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to rewind session', error as Error)
    }
    process.exit(1)
  }
}

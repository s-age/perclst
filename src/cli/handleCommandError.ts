import { stderr } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { UserCancelledError } from '@src/errors/userCancelledError'

export function handleCommandError(error: unknown, fallbackMessage: string): never {
  if (error instanceof UserCancelledError) {
    stderr.print('Cancelled.')
    process.exit(0)
  }
  if (error instanceof ValidationError) {
    stderr.print(`Invalid arguments: ${error.message}`)
  } else if (error instanceof RateLimitError) {
    const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
    stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
  } else {
    stderr.print(fallbackMessage, error as Error)
  }
  process.exit(1)
}

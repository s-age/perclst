import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseSweepSession } from '@src/validators/cli/sweepSession'
import { ValidationError } from '@src/errors/validationError'

type RawSweepOptions = {
  from?: string
  to?: string
  status?: string
  like?: string
  anonOnly?: boolean
  dryRun?: boolean
  force?: boolean
}

export async function sweepCommand(options: RawSweepOptions) {
  try {
    const input = parseSweepSession({
      from: options.from,
      to: options.to,
      status: options.status,
      like: options.like,
      anonOnly: options.anonOnly ?? false,
      dryRun: options.dryRun ?? false,
      force: options.force ?? false
    })

    if (input.status && !['active', 'completed', 'failed'].includes(input.status)) {
      throw new ValidationError('--status must be one of: active, completed, failed')
    }

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const targets = await sessionService.sweep(
      {
        from: input.from,
        to: input.to,
        status: input.status,
        like: input.like,
        anonOnly: input.anonOnly
      },
      input.dryRun ?? false
    )

    if (targets.length === 0) {
      stdout.print('No sessions matched the given filters')
      return
    }

    if (input.dryRun) {
      stdout.print(`\n[dry-run] ${targets.length} session(s) would be deleted:\n`)
    } else {
      stdout.print(`\nDeleted ${targets.length} session(s):\n`)
    }

    for (const s of targets) {
      const label = `${s.name ?? 'anonymous'}(${s.id})`
      stdout.print(`  [${s.metadata.status}] ${label}  created: ${s.created_at.slice(0, 10)}`)
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to sweep sessions', error as Error)
    }
    process.exit(1)
  }
}

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { ImportService } from '@src/services/importService'
import { logger } from '@src/utils/logger'
import { parseImportSession } from '@src/validators/cli/importSession'

type RawImportOptions = {
  name?: string
  cwd?: string
}

export async function importCommand(
  claudeSessionId: string,
  options: RawImportOptions
): Promise<void> {
  try {
    const input = parseImportSession({ claudeSessionId, ...options })

    const importService = container.resolve<ImportService>(TOKENS.ImportService)
    const session = await importService.import(input.claudeSessionId, {
      name: input.name,
      cwd: input.cwd,
    })

    logger.print(`Imported: ${session.id}`)
    logger.print(`  Claude session: ${session.claude_session_id}`)
    logger.print(`  Working dir:    ${session.working_dir}`)
    if (session.name) {
      logger.print(`  Name:           ${session.name}`)
    }
  } catch (error) {
    logger.error('Failed to import session', error as Error)
    process.exit(1)
  }
}

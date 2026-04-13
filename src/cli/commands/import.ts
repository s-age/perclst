import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { ImportService } from '@src/services/importService'
import { logger } from '@src/utils/logger'

export type ImportCommandOptions = {
  name?: string
  cwd?: string
}

export async function importCommand(
  claudeSessionId: string,
  options: ImportCommandOptions
): Promise<void> {
  try {
    const importService = container.resolve<ImportService>(TOKENS.ImportService)
    const session = await importService.import(claudeSessionId, {
      name: options.name,
      cwd: options.cwd
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

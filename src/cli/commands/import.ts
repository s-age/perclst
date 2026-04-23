import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { ImportService } from '@src/services/importService'
import { stdout, stderr } from '@src/utils/output'
import { parseImportSession } from '@src/validators/cli/importSession'

type RawImportOptions = {
  name?: string
  cwd?: string
  labels?: string[]
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
      labels: input.labels
    })

    stdout.print(`Imported: ${session.id}`)
    stdout.print(`  Claude session: ${session.claude_session_id}`)
    stdout.print(`  Working dir:    ${session.working_dir}`)
    if (session.name) {
      stdout.print(`  Name:           ${session.name}`)
    }
  } catch (error) {
    stderr.print('Failed to import session', error as Error)
    process.exit(1)
  }
}

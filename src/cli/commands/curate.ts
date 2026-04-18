import { readdirSync } from 'fs'
import { join } from 'path'
import { stdout } from '@src/utils/output'
import { startCommand } from './start'

export async function curateCommand() {
  const draftDir = join(process.cwd(), 'knowledge', 'draft')
  let entries: string[] = []
  try {
    entries = readdirSync(draftDir).filter((f) => f !== '.gitkeep')
  } catch {
    // directory doesn't exist — nothing to curate
  }

  if (entries.length === 0) {
    stdout.print('No draft entries to curate.')
    return
  }

  await startCommand('Promote all entries in knowledge/draft/ into structured knowledge/ files.', {
    procedure: 'meta-curate-knowledge',
    allowedTools: ['Write', 'Read', 'Bash'],
    outputOnly: true
  })
}

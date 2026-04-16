import { startCommand } from './start'

export async function curateCommand() {
  await startCommand('Promote all entries in knowledge/draft/ into structured knowledge/ files.', {
    procedure: 'meta-curate-knowledge',
    allowedTools: ['Write', 'Read', 'Bash'],
    outputOnly: true
  })
}

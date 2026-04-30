import type { Command } from 'commander'
import { listCommand } from './commands/list'
import { showCommand } from './commands/show'
import { analyzeCommand } from './commands/analyze'
import { summarizeCommand } from './commands/summarize'
import { renameCommand } from './commands/rename'
import { tagCommand } from './commands/tag'
import { deleteCommand } from './commands/delete'
import { sweepCommand } from './commands/sweep'
import { importCommand } from './commands/import'
import { rewindCommand } from './commands/rewind'

function registerSessionListingCommands(program: Command): void {
  program
    .command('list')
    .description('List all sessions')
    .option('-l, --label <label>', 'Filter by label')
    .option('--like <pattern>', 'Filter by name substring')
    .action(listCommand)

  program
    .command('show')
    .description('Show session details')
    .argument('<session>', 'Session ID or name')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .option('--head <n>', 'Show first N turns')
    .option('--tail <n>', 'Show last N turns')
    .option('--order <order>', 'Turn display order (asc|desc)', 'asc')
    .option('--length <n>', 'Truncate content to N characters')
    .action(showCommand)

  program
    .command('analyze')
    .description('Analyze a session from Claude Code jsonl history')
    .argument('<session>', 'Session ID or name')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .option('--print-detail', 'Show full content of each turn including tool results')
    .action(analyzeCommand)

  program
    .command('summarize')
    .description('Aggregate statistics across sessions')
    .option('--like <pattern>', 'Filter sessions by name substring')
    .option('-l, --label <value>', 'Filter sessions by label')
    .option('-f, --format <fmt>', 'Output format: text (default) or json')
    .action(summarizeCommand)
}

function registerSessionMutationCommands(program: Command): void {
  program
    .command('rename')
    .description('Rename a session')
    .argument('<session>', 'Session ID or name')
    .argument('<name>', 'New name for the session')
    .option('-l, --label <labels...>', 'Set labels for the session (replaces existing)')
    .action(renameCommand)

  program
    .command('tag')
    .description('Set labels on a session (replaces existing labels)')
    .argument('<session>', 'Session ID or name')
    .argument('<labels...>', 'Labels to set')
    .action(tagCommand)

  program
    .command('delete')
    .description('Delete a session')
    .argument('<session>', 'Session ID or name')
    .action(deleteCommand)

  program
    .command('sweep')
    .description('Bulk-delete sessions within a date range')
    .option('--from <date>', 'Delete sessions created on or after this date (YYYY-MM-DD)')
    .option('--to <date>', 'Delete sessions created on or before this date (YYYY-MM-DD)')
    .option('--status <status>', 'Only delete sessions with this status (active|completed|failed)')
    .option('--like <pattern>', 'Only delete sessions whose name contains this string')
    .option('--anon-only', 'Only delete sessions with no name')
    .option('--dry-run', 'Preview matching sessions without deleting')
    .option('--force', 'Required when --to is omitted (confirms open-ended deletion)')
    .action(sweepCommand)

  program
    .command('import')
    .description('Import a Claude Code session into perclst management')
    .argument('<claude-session-id>', 'Claude Code session ID')
    .option('-n, --name <name>', 'Name for the imported session')
    .option(
      '--cwd <path>',
      'Working directory of the Claude Code session (auto-detected if omitted)'
    )
    .option('-l, --label <labels...>', 'Labels for the imported session')
    .action(importCommand)

  program
    .command('rewind')
    .description('List or create a rewind point for a session')
    .argument('[session]', 'Session ID or name')
    .argument('[index]', 'Turn index to rewind to (0 = most recent, no truncation)')
    .option('--list', 'List available rewind points')
    .option('--length <n>', 'Characters of response to show per turn (with --list)', '120')
    .action(rewindCommand)
}

export function registerSessionCommands(program: Command): void {
  registerSessionListingCommands(program)
  registerSessionMutationCommands(program)
}

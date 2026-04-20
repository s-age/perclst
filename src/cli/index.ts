#!/usr/bin/env node

import { Command } from 'commander'
import { startCommand } from './commands/start'
import { resumeCommand } from './commands/resume'
import { forkCommand } from './commands/fork'
import { listCommand } from './commands/list'
import { showCommand } from './commands/show'
import { deleteCommand } from './commands/delete'
import { analyzeCommand } from './commands/analyze'
import { renameCommand } from './commands/rename'
import { importCommand } from './commands/import'
import { sweepCommand } from './commands/sweep'
import { rewindCommand } from './commands/rewind'
import { runCommand } from './commands/run'
import { curateCommand } from './commands/curate'
import { setupContainer } from '@src/core/di/setup'

setupContainer()

const program = new Command()

program.name('perclst').description('CLI tool for managing Claude Code sub-agents').version('0.1.0')

// Start command
program
  .command('start')
  .description('Start a new agent session')
  .argument('<task>', 'Task description')
  .option('-p, --procedure <name>', 'Procedure to use')
  .option('-n, --name <name>', 'Name for the session')
  .option('-t, --tags <tags...>', 'Tags for the session')
  .option(
    '--allowed-tools <tools...>',
    'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)'
  )
  .option(
    '--disallowed-tools <tools...>',
    'Claude Code built-in tools to deny (e.g. Bash Edit Write)'
  )
  .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
  .option('--silent-thoughts', 'Hide thinking blocks from output')
  .option('--silent-tool-response', 'Hide tool call details from output')
  .option('--silent-usage', 'Hide token usage from output')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .option('--max-turns <n>', 'Max message count before graceful termination (-1 = disabled)')
  .option(
    '--max-context-tokens <n>',
    'Max context window tokens before graceful termination (-1 = disabled)'
  )
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(startCommand)

// Resume command
program
  .command('resume')
  .description('Resume an existing session')
  .argument('<session-id>', 'Session ID')
  .argument('<instruction>', 'Additional instruction')
  .option(
    '--allowed-tools <tools...>',
    'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)'
  )
  .option(
    '--disallowed-tools <tools...>',
    'Claude Code built-in tools to deny (e.g. Bash Edit Write)'
  )
  .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
  .option('--silent-thoughts', 'Hide thinking blocks from output')
  .option('--silent-tool-response', 'Hide tool call details from output')
  .option('--silent-usage', 'Hide token usage from output')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .option('--max-turns <n>', 'Max message count before graceful termination (-1 = disabled)')
  .option(
    '--max-context-tokens <n>',
    'Max context window tokens before graceful termination (-1 = disabled)'
  )
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(resumeCommand)

// Fork command
program
  .command('fork')
  .description('Fork an existing session into a new independent session')
  .argument('<session-id>', 'Original session ID to fork from')
  .argument('<prompt>', 'Prompt to run in the forked session')
  .option('-n, --name <name>', 'Name for the new forked session')
  .option(
    '--allowed-tools <tools...>',
    'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)'
  )
  .option(
    '--disallowed-tools <tools...>',
    'Claude Code built-in tools to deny (e.g. Bash Edit Write)'
  )
  .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
  .option('--silent-thoughts', 'Hide thinking blocks from output')
  .option('--silent-tool-response', 'Hide tool call details from output')
  .option('--silent-usage', 'Hide token usage from output')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .option('--max-turns <n>', 'Max message count before graceful termination (-1 = disabled)')
  .option(
    '--max-context-tokens <n>',
    'Max context window tokens before graceful termination (-1 = disabled)'
  )
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(forkCommand)

// List command
program.command('list').description('List all sessions').action(listCommand)

// Show command
program
  .command('show')
  .description('Show session details')
  .argument('<session-id>', 'Session ID')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(showCommand)

// Analyze command
program
  .command('analyze')
  .description('Analyze a session from Claude Code jsonl history')
  .argument('<session-id>', 'Session ID')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('--print-detail', 'Show full content of each turn including tool results')
  .action(analyzeCommand)

// Delete command
program
  .command('delete')
  .description('Delete a session')
  .argument('<session-id>', 'Session ID')
  .action(deleteCommand)

// Rename command
program
  .command('rename')
  .description('Rename a session')
  .argument('<session-id>', 'Session ID')
  .argument('<name>', 'New name for the session')
  .action(renameCommand)

// Import command
program
  .command('import')
  .description('Import a Claude Code session into perclst management')
  .argument('<claude-session-id>', 'Claude Code session ID')
  .option('-n, --name <name>', 'Name for the imported session')
  .option('--cwd <path>', 'Working directory of the Claude Code session (auto-detected if omitted)')
  .action(importCommand)

// Rewind command
program
  .command('rewind')
  .description('List or create a rewind point for a session')
  .argument('[session-id]', 'Session ID')
  .argument('[index]', 'Turn index to rewind to (0 = most recent, no truncation)')
  .option('--list', 'List available rewind points')
  .option('--length <n>', 'Characters of response to show per turn (with --list)', '120')
  .action(rewindCommand)

// Sweep command
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

// Curate command
program
  .command('curate')
  .description('Promote all knowledge/draft/ entries into structured knowledge/ files')
  .action(curateCommand)

// Run command
program
  .command('run')
  .description('Execute a pipeline of agent tasks from a JSON file')
  .argument('<pipeline-path>', 'Path to the pipeline JSON file')
  .option('--model <model>', 'Default model for all agent tasks (e.g. sonnet, opus, haiku)')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .option('--batch', 'Disable TUI and use plain output')
  .option('--yes', 'Auto-approve all permission prompts without asking')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(runCommand)

// Reject single-dash multi-character options (e.g. -name instead of --name)
for (const arg of process.argv.slice(2)) {
  if (/^-[a-zA-Z]{2,}/.test(arg)) {
    console.error(`error: invalid option '${arg}' — did you mean '-${arg}'?`)
    process.exit(1)
  }
}

program.parse()

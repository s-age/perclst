#!/usr/bin/env node

import { Command } from 'commander'
import { startCommand } from './commands/start'
import { resumeCommand } from './commands/resume'
import { listCommand } from './commands/list'
import { showCommand } from './commands/show'
import { deleteCommand } from './commands/delete'
import { analyzeCommand } from './commands/analyze'
import { renameCommand } from './commands/rename'
import { importCommand } from './commands/import'
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
  .action(resumeCommand)

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

program.parse()

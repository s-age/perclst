#!/usr/bin/env node

import { Command } from 'commander'
import { startCommand } from './commands/start.js'
import { resumeCommand } from './commands/resume.js'
import { listCommand } from './commands/list.js'
import { showCommand } from './commands/show.js'
import { deleteCommand } from './commands/delete.js'

const program = new Command()

program
  .name('perclst')
  .description('CLI tool for managing Claude Code sub-agents')
  .version('0.1.0')

// Start command
program
  .command('start')
  .description('Start a new agent session')
  .argument('<task>', 'Task description')
  .option('-p, --procedure <name>', 'Procedure to use')
  .option('-t, --tags <tags...>', 'Tags for the session')
  .option('--allowed-tools <tools...>', 'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)')
  .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
  .option('--silent-thoughts', 'Hide thinking blocks from output')
  .option('--silent-tool-response', 'Hide tool call details from output')
  .option('--silent-usage', 'Hide token usage from output')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .action(startCommand)

// Resume command
program
  .command('resume')
  .description('Resume an existing session')
  .argument('<session-id>', 'Session ID')
  .argument('<instruction>', 'Additional instruction')
  .option('--allowed-tools <tools...>', 'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)')
  .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
  .option('--silent-thoughts', 'Hide thinking blocks from output')
  .option('--silent-tool-response', 'Hide tool call details from output')
  .option('--silent-usage', 'Hide token usage from output')
  .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
  .action(resumeCommand)

// List command
program
  .command('list')
  .description('List all sessions')
  .action(listCommand)

// Show command
program
  .command('show')
  .description('Show session details')
  .argument('<session-id>', 'Session ID')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .action(showCommand)

// Delete command
program
  .command('delete')
  .description('Delete a session')
  .argument('<session-id>', 'Session ID')
  .action(deleteCommand)

program.parse()

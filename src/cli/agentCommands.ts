import type { Command } from 'commander'
import { startCommand } from './commands/start'
import { resumeCommand } from './commands/resume'
import { forkCommand } from './commands/fork'
import { chatCommand } from './commands/chat'
import { inspectCommand } from './commands/inspect'
import { curateCommand } from './commands/curate'
import { surveyCommand } from './commands/survey'
import { retrieveCommand } from './commands/retrieve'
import { runCommand } from './commands/run'
import { forgeCommand } from './commands/forge'
import { reviewCommand } from './commands/review'

function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start a new agent session')
    .argument('<task>', 'Task description')
    .option('-p, --procedure <name>', 'Procedure to use')
    .option('-n, --name <name>', 'Name for the session')
    .option('-l, --label <labels...>', 'Labels for the session')
    .option(
      '--allowed-tools <tools...>',
      'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)'
    )
    .option(
      '--disallowed-tools <tools...>',
      'Claude Code built-in tools to deny (e.g. Bash Edit Write)'
    )
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--silent-thoughts', 'Hide thinking blocks from output')
    .option('--silent-tool-response', 'Hide tool call details from output')
    .option('--silent-usage', 'Hide token usage from output')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .option('--max-messages <n>', 'Max message count before graceful termination (-1 = disabled)')
    .option(
      '--max-context-tokens <n>',
      'Max context window tokens before graceful termination (-1 = disabled)'
    )
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(startCommand)
}

function registerResumeCommand(program: Command): void {
  program
    .command('resume')
    .description('Resume an existing session')
    .argument('<session-id>', 'Session ID or name')
    .argument('<instruction>', 'Additional instruction')
    .option('-l, --label <labels...>', 'Labels to add to the session (appends to existing)')
    .option(
      '--allowed-tools <tools...>',
      'Claude Code built-in tools to allow without prompting (e.g. WebFetch WebSearch Bash)'
    )
    .option(
      '--disallowed-tools <tools...>',
      'Claude Code built-in tools to deny (e.g. Bash Edit Write)'
    )
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--silent-thoughts', 'Hide thinking blocks from output')
    .option('--silent-tool-response', 'Hide tool call details from output')
    .option('--silent-usage', 'Hide token usage from output')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .option('--max-messages <n>', 'Max message count before graceful termination (-1 = disabled)')
    .option(
      '--max-context-tokens <n>',
      'Max context window tokens before graceful termination (-1 = disabled)'
    )
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(resumeCommand)
}

function registerInteractiveCommands(program: Command): void {
  program
    .command('chat')
    .description('Resume a session interactively in Claude Code')
    .argument('<session>', 'Session ID or name')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .action(chatCommand)

  program
    .command('fork')
    .description('Fork an existing session into a new independent session')
    .argument('<session-id>', 'Original session ID or name to fork from')
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
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--silent-thoughts', 'Hide thinking blocks from output')
    .option('--silent-tool-response', 'Hide tool call details from output')
    .option('--silent-usage', 'Hide token usage from output')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .option('--max-messages <n>', 'Max message count before graceful termination (-1 = disabled)')
    .option(
      '--max-context-tokens <n>',
      'Max context window tokens before graceful termination (-1 = disabled)'
    )
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(forkCommand)
}

function registerInspectionCommands(program: Command): void {
  program
    .command('inspect')
    .description('Run a pre-push code inspection between two git refs')
    .argument('<old>', 'Base git ref (older commit or branch)')
    .argument('<new>', 'Head git ref (newer commit or branch)')
    .option('-p, --prompt <prompt>', 'Additional instruction appended to the inspection prompt')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .action(inspectCommand)

  program
    .command('review')
    .description(
      'Review pending changes or a target path for architectural, security, and performance issues'
    )
    .argument('[target-path]', 'Path to review (defaults to pending git changes)')
    .option('-p, --prompt <prompt>', 'Additional instruction appended to the review prompt')
    .option('--output <path>', 'Write violation report to this file')
    .action(reviewCommand)

  program
    .command('survey')
    .description('Survey the codebase for bug investigation or pre-implementation research')
    .argument('[query]', 'Natural-language query describing what to investigate')
    .option('--refresh', 'Refresh codebase catalogs from current source')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .action(surveyCommand)
}

function registerKnowledgeCommands(program: Command): void {
  program
    .command('curate')
    .description('Promote all knowledge/draft/ entries into structured knowledge/ files')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .action(curateCommand)

  program
    .command('retrieve')
    .description('Search the knowledge base for one or more keywords')
    .argument('<keywords...>', 'Keywords to search for')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .action(retrieveCommand)
}

function registerPipelineCommands(program: Command): void {
  program
    .command('run')
    .description('Execute a pipeline of agent tasks from a JSON or YAML file')
    .argument('<pipeline-path>', 'Path to the pipeline file (.json, .yaml, or .yml)')
    .option('--model <model>', 'Default model for all agent tasks (e.g. sonnet, opus, haiku)')
    .option(
      '--effort <level>',
      'Default effort level for all agent tasks (low, medium, high, xhigh, max)'
    )
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .option('--batch', 'Disable TUI and use plain output')
    .option('--yes', 'Auto-approve all permission prompts without asking')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(runCommand)

  program
    .command('forge')
    .description('Generate an implementation pipeline from a plan file')
    .argument('<plan-file-path>', 'Path to the plan file (.md)')
    .option('-p, --prompt <prompt>', 'Additional instruction appended to the generation prompt')
    .option('--model <model>', 'Model to use (e.g. sonnet, opus, haiku, claude-haiku-4-5)')
    .option('--effort <level>', 'Effort level (low, medium, high, xhigh, max)')
    .option('--output-only', 'Show only the model response (implies all --silent-* flags)')
    .action(forgeCommand)
}

export function registerAgentCommands(program: Command): void {
  registerStartCommand(program)
  registerResumeCommand(program)
  registerInteractiveCommands(program)
  registerInspectionCommands(program)
  registerKnowledgeCommands(program)
  registerPipelineCommands(program)
}

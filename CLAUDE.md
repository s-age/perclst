# perclst

CLI tool for managing Claude Code sub-agents with session persistence.

## Overview

**perclst** spawns Claude sub-agents via `claude -p` command and manages their sessions locally. No API key required - uses Claude Code's existing authentication.

## Quick Start

```bash
# Start a new agent session
perclst start "task description"

# Start with specific tools pre-approved (no permission prompt)
perclst start "task description" --allowed-tools WebFetch Bash

# Start with a specific model
perclst start "task description" --model haiku

# Resume a session
perclst resume <session-id> "additional instruction"

# Resume with a different model
perclst resume <session-id> "additional instruction" --model opus

# List all sessions
perclst list

# Show session details (text)
perclst show <session-id>

# Show session details (JSON — includes thoughts and tool_history)
perclst show <session-id> --format json

# Delete a session
perclst delete <session-id>
```

> **For agents**: Always use `--output-only` when invoking perclst from within an agent.
> Without it, thoughts, tool call details, and token usage are included in the output,
> which wastes tokens and degrades efficiency.
>
> ```bash
> perclst start "task description" --output-only
> perclst resume <session-id> "instruction" --output-only
> ```

## Architecture

```
perclst
├── CLI Commands (src/cli/)
│   └── Wraps claude -p with session management
├── Session Storage (~/.perclst/sessions/)
│   └── JSON files with conversation history
├── Procedures (procedures/)
│   └── System prompts (default, conductor, analyzer)
└── MCP Server (src/mcp/)
    └── TypeScript analysis tools (ts_analyze, ts_get_references, ts_get_types)
```

## How It Works

1. **No API Key Required**: Uses `claude -p` internally
2. **Session Persistence**: Saves conversations to `~/.perclst/sessions/<session-id>.json`
3. **Procedure System**: Optional system prompts via `--procedure <name>`
4. **Model Selection**: Configurable via `config.json` (default: `claude-sonnet-4-6`)

## Configuration

**Priority**: `./.perclst/config.json` > `~/.perclst/config.json` > defaults

```json
{
  "sessions_dir": "~/.perclst/sessions",
  "logs_dir": "~/.perclst/logs",
  "model": "claude-sonnet-4-6",
  "display": {
    "header_color": "#D97757",
    "no_color": false
  }
}
```

**Available models**: `claude-sonnet-4-6`, `claude-opus-4-5`, `claude-haiku-4-5`, or aliases: `sonnet`, `opus`, `haiku`

The `--model` flag on `start` / `resume` overrides the config for that invocation only:

```bash
perclst start "heavy task" --model opus
perclst resume <session-id> "quick follow-up" --model haiku
```

**`display.header_color`**: Any `#RRGGBB` hex color. Set `no_color: true` or `NO_COLOR=1` (env) to disable colors entirely.

## Procedures

Use `--procedure <name>` to set agent behavior:

- **default**: General-purpose assistant
- **conductor**: Complex task orchestration
- **analyzer**: Code analysis (has access to ts_* MCP tools)

## Development

```bash
# Build
npm run build

# Link globally
npm link

# Run after changes
npm run build && perclst start "test"
```

## Files to Note

- `src/lib/agent/claude-cli.ts` - Executes `claude -p` command
- `src/lib/session/manager.ts` - Session CRUD operations
- `src/lib/config/resolver.ts` - Config loading with priority
- `procedures/*.md` - System prompt definitions

## Session File Format

```json
{
  "id": "uuid",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "procedure": "optional",
  "metadata": { "status": "active|completed|failed", "tags": [] },
  "injected_skills": ["skill-name"],
  "turns": [
    { "role": "user", "content": "...", "timestamp": "..." },
    {
      "role": "assistant",
      "content": "...",
      "timestamp": "...",
      "model": "claude-cli",
      "usage": {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_input_tokens": 0,
        "cache_creation_input_tokens": 0
      },
      "thoughts": [{ "type": "thinking", "thinking": "..." }],
      "tool_history": [{ "id": "...", "name": "WebFetch", "input": {}, "result": "..." }]
    }
  ]
}
```

## Common Tasks

**Add a new procedure**:
1. Create `procedures/<name>.md`
2. Use with `perclst start "task" --procedure <name>`

**Change default model**:
Edit `src/lib/config/types.ts` → `DEFAULT_CONFIG.model`

**Add MCP tools**:
1. Create `src/mcp/tools/<tool-name>.ts`
2. Register in `src/mcp/server.ts`

# cloader

CLI tool for managing Claude Code sub-agents with session persistence.

## Overview

**cloader** spawns Claude sub-agents via `claude -p` command and manages their sessions locally. No API key required - uses Claude Code's existing authentication.

## Quick Start

```bash
# Start a new agent session
cloader start "task description"

# Resume a session
cloader resume <session-id> "additional instruction"

# List all sessions
cloader list

# Show session details
cloader show <session-id>

# Delete a session
cloader delete <session-id>
```

## Architecture

```
cloader
├── CLI Commands (src/cli/)
│   └── Wraps claude -p with session management
├── Session Storage (sessions/)
│   └── JSON files with conversation history
├── Procedures (procedures/)
│   └── System prompts (default, conductor, analyzer)
└── MCP Server (src/mcp/)
    └── TypeScript analysis tools (ts_analyze, ts_get_references, ts_get_types)
```

## How It Works

1. **No API Key Required**: Uses `claude -p` internally
2. **Session Persistence**: Saves conversations to `sessions/<session-id>.json`
3. **Procedure System**: Optional system prompts via `--procedure <name>`
4. **Model Selection**: Configurable via `config.json` (default: `claude-sonnet-4-6`)

## Configuration

**Priority**: `./config.json` > `~/.cloader/config.json` > defaults

```json
{
  "sessions_dir": "sessions",
  "logs_dir": "logs",
  "model": "claude-sonnet-4-6"
}
```

**Available models**: `claude-sonnet-4-6`, `claude-opus-4`, `claude-haiku-4-5`, or aliases: `sonnet`, `opus`, `haiku`

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
npm run build && cloader start "test"
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
  "turns": [
    { "role": "user|assistant", "content": "...", "timestamp": "..." }
  ]
}
```

## Common Tasks

**Add a new procedure**:
1. Create `procedures/<name>.md`
2. Use with `cloader start "task" --procedure <name>`

**Change default model**:
Edit `src/lib/config/types.ts` → `DEFAULT_CONFIG.model`

**Add MCP tools**:
1. Create `src/mcp/tools/<tool-name>.ts`
2. Register in `src/mcp/server.ts`

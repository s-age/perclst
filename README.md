# perclst

> **Note**: This project has been tested to a reasonable extent but is still under active development. Use with care.

CLI tool for managing Claude Code sub-agents.

**Name**: *per**cl**st* — "persist" with "si" replaced by "**cl**" (from **Cl**aude Code). Pronounced "persist" or "perclst".



## Features

- **Session Management**: Create, resume, and manage agent sessions
- **Session Analysis**: Inspect turn breakdown, tool usage, and token stats from Claude Code's jsonl history
- **Local Storage**: Sessions stored in `~/.perclst/sessions/` by default
- **MCP Server**: TypeScript analysis tools for Claude Code
- **Procedure System**: Define agent behavior via system prompts

## Installation

See [INSTALLATION.md](INSTALLATION.md) for full setup instructions.

## Usage

### CLI Commands

```bash
# Start a new agent session
perclst start "Implement feature X" --procedure conductor

# Resume existing session
perclst resume <session-id> "Continue the task"

# List sessions
perclst list

# Show session details
perclst show <session-id>

# Analyze session (turn breakdown, tool uses, token stats)
perclst analyze <session-id>

# Analyze with full turn content
perclst analyze <session-id> --print-detail

# Analyze with JSON output
perclst analyze <session-id> --format json

# Delete session
perclst delete <session-id>
```

### Configuration

Sessions are stored in `~/.perclst/sessions/` by default (absolute path, independent of current working directory).

**Priority**:
1. `./.perclst/config.json` (project-local)
2. `~/.perclst/config.json` (global)
3. Default values

**Example config** (`config.json`):

```json
{
  "sessions_dir": "~/.perclst/sessions",
  "logs_dir": "~/.perclst/logs",
  "model": "claude-sonnet-4-5",
  "max_tokens": 8000,
  "temperature": 0.7
}
```

## MCP Server

Provides TypeScript analysis tools for Claude Code.

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "perclst": {
      "command": "node",
      "args": ["/path/to/perclst/dist/src/mcp/server.js"]
    }
  }
}
```

**Available tools**:
- `ts_analyze`: Analyze TypeScript code structure
- `ts_get_references`: Find symbol references
- `ts_get_types`: Get type definitions

## License

CC0 1.0 Universal — public domain dedication, no rights reserved.

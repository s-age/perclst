# perclst

> **Note**: This project has been tested to a reasonable extent but is still under active development. Use with care.

CLI tool for managing Claude Code sub-agents.

## Features

- **Session Management**: Create, resume, and manage agent sessions
- **Local Storage**: Sessions stored per-project by default
- **MCP Server**: TypeScript analysis tools for Claude Code
- **Procedure System**: Define agent behavior via system prompts

## Installation

```bash
git clone https://github.com/s-age/perclst.git
cd perclst
npm install
npm run build
npm link
```

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

# Delete session
perclst delete <session-id>
```

### Configuration

Sessions are stored in `.perclst/sessions/` by default.

**Priority**:
1. `./.perclst/config.json` (project-local)
2. `~/.perclst/config.json` (global)
3. Default values

**Example config** (`config.json`):

```json
{
  "sessions_dir": "sessions",
  "logs_dir": "logs",
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
      "args": ["/path/to/perclst/dist/mcp/server.js"]
    }
  }
}
```

**Available tools**:
- `ts_analyze`: Analyze TypeScript code structure
- `ts_get_references`: Find symbol references
- `ts_get_types`: Get type definitions
- `ts_test_strategist`: Suggest test strategy

## License

CC0 1.0 Universal — public domain dedication, no rights reserved.

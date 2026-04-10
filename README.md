# cloader

CLI tool for managing Claude Code sub-agents.

## Features

- **Session Management**: Create, resume, and manage agent sessions
- **Local Storage**: Sessions stored per-project by default
- **MCP Server**: TypeScript analysis tools for Claude Code
- **Procedure System**: Define agent behavior via system prompts

## Installation

```bash
# Install globally
npm install -g cloader

# Or link locally for development
git clone <repo>
cd cloader
npm install
npm run build
npm link
```

## Usage

### CLI Commands

```bash
# Start a new agent session
cloader start "Implement feature X" --procedure conductor

# Resume existing session
cloader resume <session-id> "Continue the task"

# List sessions
cloader list

# Show session details
cloader show <session-id>

# Delete session
cloader delete <session-id>
```

### Configuration

Sessions are stored in `.cloader/sessions/` by default.

**Priority**:
1. `./.cloader/config.json` (project-local)
2. `~/.cloader/config.json` (global)
3. Default values

**Example config** (`.cloader/config.json`):

```json
{
  "sessions_dir": ".cloader/sessions",
  "logs_dir": ".cloader/logs",
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
    "cloader": {
      "command": "node",
      "args": ["/path/to/cloader/dist/mcp/server.js"]
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

MIT

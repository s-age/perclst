# Setup Guide

## Installation

### Development

```bash
cd perclst
npm install
npm run build
npm link
```

Now `perclst` command is available globally.

### Global Installation (after publishing)

```bash
npm install -g perclst
```

## Configuration

### 1. Set API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.zshrc
```

### 2. Project Configuration (Optional)

Create `config.json` in your project:

```json
{
  "sessions_dir": "sessions",
  "logs_dir": "logs",
  "model": "claude-sonnet-4-5",
  "max_tokens": 8000,
  "temperature": 0.7
}
```

### 3. Global Configuration (Optional)

Create `~/.perclst/config.json`:

```json
{
  "sessions_dir": "~/perclst-sessions",
  "model": "claude-opus-4",
  "max_tokens": 16000
}
```

## MCP Server Setup

To use TypeScript analysis tools in Claude Code, add to `~/.claude/settings.json`:

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

Replace `/path/to/perclst` with the actual path.

## Usage Examples

### Basic Usage

```bash
# Start a new session
perclst start "Analyze the Button component"

# Output:
# Session created: abc123-def456-...
# 
# --- Agent Response ---
# I'll analyze the Button component...
#
# Session ID: abc123-def456-...
```

### With Procedure

```bash
# Use conductor procedure for complex tasks
perclst start "Refactor authentication logic" --procedure conductor

# Use analyzer procedure for code analysis
perclst start "Document the API endpoints" --procedure analyzer
```

### Resume Session

```bash
# Continue a session
perclst resume abc123 "Now add TypeScript types"
```

### List Sessions

```bash
perclst list

# Output:
# Found 3 session(s):
#
# [active] abc123-def456-...
#   Created: 2026-04-11 08:00:00
#   Task: Analyze the Button component
#   Procedure: analyzer
#
# [completed] def456-ghi789-...
#   Created: 2026-04-10 15:30:00
#   Task: Refactor authentication logic
#   Procedure: conductor
```

### Show Session Details

```bash
# Text format (default)
perclst show abc123

# JSON format
perclst show abc123 --format json
```

### Delete Session

```bash
perclst delete abc123
```

## Project Structure

```
your-project/
├── sessions/             # Session JSONs
│   ├── abc123.json
│   └── def456.json
├── logs/                 # Execution logs
│   ├── abc123.log
│   └── def456.log
├── config.json          # Project config (optional)
├── src/
└── ...
```

## Tips

### 1. Add to .gitignore

```gitignore
sessions/*.json
logs/
```

### 2. Use Procedures

Procedures define agent behavior via system prompts:

- `default`: General-purpose assistant
- `conductor`: Complex task orchestration
- `analyzer`: Code analysis and documentation

### 3. Session Management

Sessions are stored locally per project by default. This keeps your work organized and isolated.

### 4. MCP Tools in Sessions

When using the `analyzer` procedure, the agent has access to TypeScript analysis tools:

- `ts_analyze`: Analyze code structure
- `ts_get_references`: Find symbol references
- `ts_get_types`: Get type definitions

## Troubleshooting

### Command not found

Run `npm link` again in the perclst directory.

### API Key Error

Make sure `ANTHROPIC_API_KEY` is set:

```bash
echo $ANTHROPIC_API_KEY
```

### Sessions Directory

Check where sessions are stored:

```bash
# Default: sessions/ in current directory
ls sessions
```

### Build Errors

Clean and rebuild:

```bash
npm run clean
npm run build
```

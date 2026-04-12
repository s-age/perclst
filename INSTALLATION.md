# Installation

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Claude Code](https://claude.ai/code) CLI installed and authenticated

## Steps

### 1. Clone and build

```bash
git clone https://github.com/s-age/perclst.git
cd perclst
npm install
npm run build
```

### 2. Link globally

```bash
npm link
```

`perclst` command is now available globally.

### 3. Install hooks

```bash
npm run setup
```

This registers the skill-inject hook into `~/.claude/settings.json`.
The script shows a before/after diff and asks for confirmation before writing.

```
destination: /Users/you/.claude/settings.json

before:
{ ... }

after:
{ ... }

Apply changes? [y/N]
```

If an existing `settings.json` is found, it is backed up to `~/.claude/settings.json.bak`
before writing. To restore:

```bash
cp ~/.claude/settings.json.bak ~/.claude/settings.json
```

To skip the confirmation prompt:

```bash
npm run setup -- --yes
```

To re-run after rebuilding:

```bash
npm run setup
```

## Configuration (Optional)

**Priority**: `./.perclst/config.json` > `~/.perclst/config.json` > defaults

```json
{
  "sessions_dir": "sessions",
  "logs_dir": "logs",
  "model": "claude-sonnet-4-6",
  "display": {
    "header_color": "#D97757",
    "no_color": false
  }
}
```

Available model aliases: `sonnet`, `opus`, `haiku`

## MCP Server (Optional)

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

Replace `/path/to/perclst` with the actual path.

**Available tools**: `ts_analyze`, `ts_get_references`, `ts_get_types`

## Troubleshooting

### `perclst: command not found`

Re-run `npm link` in the perclst directory.

### Build errors

```bash
npm run clean
npm run build
```

### Hook not applied

Re-run `npm run setup`. Check that `~/.claude/settings.json` contains an entry
with `skill-inject.mjs` in the `hooks.PreToolUse` section.

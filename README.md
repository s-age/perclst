# perclst

> **Note**: This project has been tested to a reasonable extent but is still under active development. Use with care.

CLI tool for managing Claude Code sub-agents.

**Name**: *per**cl**st* — "persist" with "si" replaced by "**cl**" (from **Cl**aude Code). Pronounced "persist" or "perclst".



## Features

- **Session Management**: Create, resume, fork, and manage agent sessions
- **Session Analysis**: Inspect turn breakdown, tool usage, and token stats from Claude Code's jsonl history
- **Local Storage**: Sessions stored in `~/.perclst/sessions/` by default
- **MCP Server**: TypeScript analysis tools for Claude Code
- **Procedure System**: Define agent behavior via system prompts

## Concepts

perclst's design maps onto Docker's execution model:

| Docker | perclst |
|---|---|
| Base image | Model (`--model`) — capability level of the agent |
| Commands / daemons in the image | Skills (`.claude/skills/`) — **How** rules, auto-injected when relevant files are accessed |
| `ENTRYPOINT` | Procedure (`--procedure`) — **What** steps the agent follows, set once at session start |
| `CMD` | Prompt — the instruction passed to each `start` / `resume` |
| Running container | Session — one live instance of model + skills + procedure |

**Skills vs Procedures**:
- **Skills** carry *how* rules — coding conventions, import constraints, layer responsibilities. They are baked into the project (like binaries in an image) and activated automatically based on which files the agent touches.
- **Procedures** carry *what* steps — task orchestration, workflow sequences, agent roles. A procedure is the entrypoint that shapes how every prompt in the session is interpreted.

> **Note**: Claude Code's auto-injected Skills (`.claude/skills/`) are not available in headless
> mode (`claude -p`), which makes role modularization brittle in multi-agent setups. perclst
> re-enables them by running a `PreToolUse` hook that injects matching skill content as
> `additionalContext` before each relevant tool call — so sub-agents get the same contextual
> rules as interactive sessions.

## Installation

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup instructions.

## Usage

See [docs/USAGE.md](docs/USAGE.md) for the full command reference.

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

> This applies to perclst's own source code only. Each dependency is distributed under its own license — refer to the respective package for terms.

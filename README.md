# perclst

> **Note**: This project has been tested to a reasonable extent but is still under active development. Use with care.

CLI tool for managing Claude Code sub-agents.

**Name**: *per**cl**st* — "persist" with "si" replaced by "**cl**" (from **Cl**aude Code). Pronounced "persist" or "perclst".



## Features

- **Named Sessions**: Assign human-readable names at creation (`--name`) or later (`rename`). Session state is managed by Claude Code itself — perclst adds a thin naming layer on top so you can identify and resume the right session without replacing Claude Code's own session model.
- **Rewind by Number**: Branch from any past assistant response by count rather than UUID — `--list` previews each turn so you can pinpoint where to diverge. Index `0` forks at the latest turn (no truncation); higher indices step further back.
- **Permission Prompts in Headless Mode**: In headless (`claude -p`) sessions, permission requests have no UI to surface them. The bundled `ask_permission` MCP tool intercepts these requests and routes them to the terminal via `/dev/tty`, so you can approve or deny each tool call interactively without pre-approving everything upfront.
- **Skills in Headless Mode**: Claude Code's auto-injected Skills (`.claude/skills/`) are unavailable in headless mode (`claude -p`) — perclst re-enables them via a `PreToolUse` hook that injects matching skill content as `additionalContext`, so sub-agents get the same contextual rules as interactive sessions
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

## Installation

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup instructions.

## Usage

See [docs/USAGE.md](docs/USAGE.md) for the full command reference.

## MCP Server

The MCP server exists primarily to handle permission prompts in headless (`claude -p`) sessions. In headless mode there is no interactive UI, so permission requests would silently block. The bundled `ask_permission` tool intercepts these requests and routes them to the terminal via `/dev/tty`, letting you approve or deny each tool call with a `[y/N]` prompt without pre-approving everything upfront.

The TypeScript analysis tools (`ts_analyze`, `ts_get_references`, `ts_get_types`, `ts_checker`, `ts_test_strategist`) are used for developing perclst itself. You can add your own project-specific tools to `src/mcp/tools/` and register them in `src/mcp/server.ts`.

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
- `ask_permission`: Route permission prompts to the terminal in headless sessions
- `ts_analyze`: Analyze TypeScript code structure
- `ts_get_references`: Find symbol references
- `ts_get_types`: Get type definitions
- `ts_checker`: Run lint, build, and tests in one shot
- `ts_test_strategist`: Formulate a unit test strategy for a TypeScript file

## License

CC0 1.0 Universal — public domain dedication, no rights reserved.

> This applies to perclst's own source code only. Each dependency is distributed under its own license — refer to the respective package for terms.

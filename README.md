# perclst

> **Note**: This project has been tested to a reasonable extent but is still under active development. Use with care.

CLI tool for managing Claude Code sub-agents.

**Name**: *per**cl**st* — "persist" with "si" replaced by "**cl**" (from **Cl**aude Code). Pronounced "persist" or "perclst".

## The Problem

When you start running Claude Code seriously with `claude -p` (headless mode), you hit these walls:

- **Skills silently disappear**: `.claude/skills/` are auto-injected in interactive sessions but completely ignored in headless mode — sub-agents lose all your coding conventions and constraints without any warning.
- **UUIDs are unmanageable**: Every session gets a UUID. Resuming the right session means copying IDs from list output or keeping notes. There is no way to say "resume the implementer session."
- **Feedback loops require manual work**: When tests fail after an agent makes changes, you have to find the session, resume it with the error output, wait, and check again — by hand, every time.
- **Agent behavior is opaque**: Vendor UIs hide tool invocations, error traces, and per-turn token usage. You can see that an agent was slow or expensive, but you cannot diagnose why — and you cannot verify that a procedure change actually helped. See [Why Turn Count Matters](docs/why-turn-count-matters.md) for a concrete example.

## Features

- **Skills in Headless Mode**: Restores `.claude/skills/` in headless sessions via a `PreToolUse` hook that injects matching skill content as `additionalContext` — sub-agents get the same contextual rules as interactive sessions.
- **Named Sessions**: Assign human-readable names at creation (`--name`) or later (`rename`). Identify and resume the right session by name without touching UUIDs.
- **Pipeline Execution**: Define multi-agent workflows as a JSON file and run them with `perclst run pipeline.json`. Tasks execute serially; name a task to resume an existing session rather than start a new one — routing work to a dedicated implementer, tester, or reviewer agent across steps. Script tasks can verify agent output (e.g. run tests) and automatically loop back to a named agent with the failure output as feedback, up to a configurable retry limit.
- **Rewind by Number**: Branch from any past assistant response by count rather than UUID — `--list` previews each turn so you can pinpoint where to diverge. Index `0` forks at the latest turn (no truncation); higher indices step further back.
- **Permission Prompts in Headless Mode**: In headless (`claude -p`) sessions, permission requests have no UI to surface them. The bundled `ask_permission` MCP tool intercepts these requests and routes them to the terminal via `/dev/tty`, so you can approve or deny each tool call interactively without pre-approving everything upfront.
- **Session Management**: Create, resume, fork, and manage agent sessions
- **Session Analysis**: Inspect turn breakdown, tool usage, and token stats from Claude Code's jsonl history — the visibility layer that addresses [Agent behavior is opaque](#the-problem) above. See [Why Turn Count Matters](docs/why-turn-count-matters.md) for a concrete example of the feedback loop this enables.
- **Local Storage**: Sessions stored in `~/.perclst/sessions/` by default
- **MCP Server**: TypeScript analysis tools for Claude Code
- **Procedure System**: Define agent behavior via system prompts
- **Knowledge Lifecycle**: Agents capture discoveries and gotchas to `knowledge/draft/`; `perclst curate` promotes them into structured entries; `knowledge_search` lets future agents retrieve them before starting work

## Concepts

perclst's design maps onto Docker's execution model:

| Docker | perclst | Description |
|---|---|---|
| Base image | Model (`--model`) | Capability level of the agent |
| Commands / daemons in the image | Skills (`.claude/skills/`) | **How** rules — auto-injected when relevant files are accessed |
| `ENTRYPOINT` | Procedure (`--procedure`) | **What** steps the agent follows, set once at session start |
| `CMD` | Prompt | Instruction passed to each `start` / `resume` |
| `--name` | `--name` | Human-readable name for an instance instead of a random ID |
| Running container | Session | One live instance of model + skills + procedure |
| `docker attach` | `perclst chat` | Attach your terminal to an existing instance to observe and interact in real time |
| `docker volume` | Knowledge base (`knowledge/`) | Persistent data shared across sessions |
| `docker compose` | Pipeline (`perclst run`) | Multi-agent workflow — tasks run serially, with named sessions and retry loops |

**Skills vs Procedures**:
- **Skills** carry *how* rules — coding conventions, import constraints, layer responsibilities. They are baked into the project (like binaries in an image) and activated automatically based on which files the agent touches.
- **Procedures** carry *what* steps — task orchestration, workflow sequences, agent roles. A procedure is the entrypoint that shapes how every prompt in the session is interpreted.

## Installation

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup instructions.

## Usage

See [docs/USAGE.md](docs/USAGE.md) for the full command reference.

New to perclst? Walk through the core workflow in [docs/TUTORIAL.md](docs/TUTORIAL.md).

## MCP Server

The MCP server exists primarily to handle permission prompts in headless (`claude -p`) sessions. In headless mode there is no interactive UI, so permission requests would silently block. The bundled `ask_permission` tool intercepts these requests and routes them to the terminal via `/dev/tty`, letting you approve or deny each tool call with a `[y/N]` prompt without pre-approving everything upfront.

The TypeScript analysis tools are used for developing perclst itself. You can add your own project-specific tools to `src/mcp/tools/` and register them in `src/mcp/server.ts`.

See [docs/MCP.md](docs/MCP.md) for setup instructions and the full tool reference.

## Knowledge

perclst includes a lightweight knowledge system that lets agents accumulate and retrieve project-specific context across sessions.

**Lifecycle:**

```
Agent encounters something worth remembering
  → writes a freeform note to knowledge/draft/
  → perclst curate promotes it into a structured knowledge/ entry
  → future agents call knowledge_search before starting work
```

**Capture** — when an agent hits a gotcha, makes a non-obvious design decision, or learns how something actually behaves (vs. how it was assumed to work), it drops a `.md` file in `knowledge/draft/`. No structure required — freeform notes are fine.

**Curate** — `perclst curate` runs the `meta-curate-knowledge` procedure, which reads all draft entries, structures them, and files them into `knowledge/`. Only this procedure writes to `knowledge/` directly; all agents write to `knowledge/draft/` only.

**Search** — the `knowledge_search` MCP tool lets agents query the knowledge base by keyword before starting a task. This surfaces past problems, decisions, and gotchas that aren't visible in the code itself.

The result is a knowledge base that grows with the project — built by agents, consumed by agents, without any manual curation step in the normal workflow.

## License

CC0 1.0 Universal — public domain dedication, no rights reserved.

> This applies to perclst's own source code only. Each dependency is distributed under its own license — refer to the respective package for terms.

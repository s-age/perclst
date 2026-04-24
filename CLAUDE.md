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

## Architecture Rules

> **MANDATORY — read `.claude/skills/arch/SKILL.md` before touching any file in `src/`.**
>
> That file defines the authoritative layer structure and unidirectional import rules for this codebase.
> You are required to understand it, not just skim it.
> Specifically, before writing or reviewing any code you must be able to answer:
>
> - Which layer owns this change (`cli` / `validators` / `services` / `domains` / `repositories` / `infrastructures`)?
> - What may and must NOT this layer import?
> - Does this change introduce a cross-layer import that the rules forbid?
>
> **Do not write a single line of code if you cannot answer all three.**
> Ignorance of the import rules is not an excuse — violations are not fixable after the fact without
> cascading refactors.

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

- **meta-curate-knowledge**: Promotes `knowledge/draft/` entries into structured `knowledge/` files
- **meta-plan**: Produces a plan directory (`plans/<slug>/`) with interface definitions per layer, consumed downstream by `code-base-survey` and `meta-pipeline-creator`

> **Note**: Some procedures require file write access. The `meta-curate-knowledge` procedure needs
> `--allowed-tools Write Read Bash Glob` or it will stall on permission prompts:
> ```bash
> perclst start "Promote all draft knowledge" --procedure meta-curate-knowledge --allowed-tools Write Read Bash Glob --output-only
> ```

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

## Knowledge Capture

When you encounter any of the following, write a note to `knowledge/draft/` immediately — don't wait:

- **Problem**: something broke, behaved unexpectedly, or caused confusion
- **Discovery**: you learned how something actually works (vs. how you assumed it worked)
- **External**: a fact from a library, tool, or API that isn't obvious from the code
- **Decision**: a design choice made for a non-obvious reason (constraints, trade-offs)
- **Gotcha**: a subtle rule or edge case that would surprise a future reader

Drop a freeform `.md` file in `knowledge/draft/` with whatever detail you have. The `meta-curate-knowledge` procedure will structure and file it properly later.

> **Rule**: Only the `meta-curate-knowledge` procedure may write directly to `knowledge/` (outside of `draft/`). All other agents and conversations must write to `knowledge/draft/` only.

> Run `perclst start "Curate all draft knowledge" --procedure meta-curate-knowledge --allowed-tools Write Read Bash Glob --output-only` to promote drafts.

## MCP Tools

This project exposes MCP tools for TypeScript analysis. Use them proactively when working in `src/`.

| Tool | What it does | When to use |
|------|-------------|-------------|
| `ts_analyze` | Returns all symbols (functions, variables, types), imports, and exports of a file | First step before writing tests or reviewing a file — gives a complete surface map without reading line by line |
| `ts_get_types` | Returns parameter types and return type for a named symbol | When you need the exact signature of a function before calling or testing it |
| `ts_get_references` | Finds all call sites of a named symbol across the codebase | Refactoring a function, assessing blast radius of a change, or understanding how a public API is actually used |
| `ts_test_strategist` | Identifies untested functions, calculates cyclomatic complexity, and suggests mocks | Starting point for any unit test task — tells you what to test and how many cases to write |
| `ts_checker` | Runs lint, build, and unit tests in one shot | After any TypeScript change — verifies correctness before reporting a task complete |
| `knowledge_search` | Searches the knowledge base by keyword (AND/OR supported) | Before starting any non-trivial task — check if a past problem, gotcha, or design decision is already documented |

### Recommended sequences

**Writing tests**:
`ts_test_strategist` → `ts_analyze` → Read target file → write tests → `ts_checker`

**Refactoring a function**:
`ts_get_references` → assess blast radius → make changes → `ts_checker`

**Reviewing an unfamiliar file**:
`ts_analyze` → `ts_get_types` on key symbols → Read file

**Looking up external information**:
`knowledge_search` → Read local docs/code → `WebFetch` (only if still needed)

## Common Tasks

**Add a new procedure**:
1. Create `procedures/<name>.md`
2. Use with `perclst start "task" --procedure <name>`

**Change default model**:
Edit `src/lib/config/types.ts` → `DEFAULT_CONFIG.model`

**Add MCP tools**:
1. Create `src/mcp/tools/<tool-name>.ts`
2. Register in `src/mcp/server.ts`

**Create a pipeline**:
Create `pipelines/<name>.json` — a JSON file with a `tasks` array of `agent` and/or `script` steps.

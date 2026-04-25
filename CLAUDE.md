# perclst

CLI tool for managing Claude Code sub-agents with session persistence.

## Overview

**perclst** spawns Claude sub-agents via `claude -p` command and manages their sessions locally. No API key required — uses Claude Code's existing authentication.

> **For agents**: Always use `--output-only` when invoking perclst from within an agent.
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

**`src/` 配下の作成・編集・レビュー時**: 必ず `arch` スキルと対象レイヤーのスキル（`arch-cli`, `arch-services` など）をロードしてから着手すること。

## Development

```bash
npm run build
npm run build && perclst start "test"
npm link   # global install after build
```

> **After any `src/` change**: verify with `ts_checker` (MCP tool) — do **not** run `eslint`, `tsc`, or test commands directly in the shell. Direct shell invocations consume context history without benefit; `ts_checker` runs lint + build + tests in one call.

## Procedures

Use `--procedure <name>` to set agent behavior:

- **meta-librarian/curate**: Promotes `knowledge/draft/` entries into structured `knowledge/` files
- **meta-plan/plan**: Produces a plan directory (`plans/<slug>/`) with interface definitions per layer

> `meta-librarian/curate` requires `--allowed-tools Write Read Bash Glob`:
> ```bash
> perclst start "Promote all draft knowledge" --procedure meta-librarian/curate --allowed-tools Write Read Bash Glob --output-only
> ```

## Key Files

- `src/lib/agent/claude-cli.ts` — Executes `claude -p` command
- `src/lib/session/manager.ts` — Session CRUD operations
- `src/lib/config/resolver.ts` — Config loading with priority
- `procedures/**/*.md` — System prompt definitions

## Knowledge Capture

Before starting any non-trivial task — run `knowledge_search` to check if a past problem, gotcha, or design decision is already documented.

When you encounter any of the following, write a note to `knowledge/draft/` immediately — don't wait:

- **Problem**: something broke, behaved unexpectedly, or caused confusion
- **Discovery**: you learned how something actually works (vs. how you assumed it worked)
- **External**: a fact from a library, tool, or API that isn't obvious from the code
- **Decision**: a design choice made for a non-obvious reason (constraints, trade-offs)
- **Gotcha**: a subtle rule or edge case that would surprise a future reader

Drop a freeform `.md` file in `knowledge/draft/` with whatever detail you have. The `meta-librarian/curate` procedure will structure and file it properly later.

> **Rule**: Only the `meta-librarian/curate` procedure may write directly to `knowledge/` (outside of `draft/`). All other agents and conversations must write to `knowledge/draft/` only.

> Run `perclst start "Curate all draft knowledge" --procedure meta-librarian/curate --allowed-tools Write Read Bash Glob --output-only` to promote drafts.

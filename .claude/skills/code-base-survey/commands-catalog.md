# CLI Commands Catalog

All `perclst` subcommands. Source of truth: `docs/USAGE.md`.

> **Freshness**: Mirrors `docs/USAGE.md`. If a command is missing or a flag differs, `docs/USAGE.md` is authoritative.

---

## Session lifecycle

| Command | Purpose |
|---|---|
| `start "<task>"` | Start a new agent session |
| `resume <session> "<instruction>"` | Resume a session with an additional instruction |
| `fork <session> "<instruction>"` | Branch a session into a new independent session |
| `rewind <session> <index>` | Fork from a past turn (index 0 = current tip) |

Common flags on `start`/`resume`/`fork`: `--model`, `--procedure`, `--name`, `--allowed-tools`, `--disallowed-tools`, `--max-turns`, `--max-context-tokens`, `--output-only`

---

## Session management

| Command | Purpose |
|---|---|
| `list` | List all sessions |
| `show <session>` | Show session turns (flags: `--format json`, `--head`, `--tail`, `--order`, `--length`) |
| `rename <session-id> "<name>"` | Set display name |
| `delete <session-id>` | Delete a session |
| `sweep` | Bulk-delete by date, status, name pattern, or anon-only (`--dry-run` available) |

---

## Analysis

| Command | Purpose |
|---|---|
| `analyze <session>` | Turn breakdown, tool usage, token stats (`--print-detail`, `--format json`) |
| `import <claude-session-id>` | Import a Claude Code session into perclst management (`--name`, `--cwd`) |

---

## Knowledge management

| Command | Purpose |
|---|---|
| `retrieve "<kw1>" "<kw2>"` | Search knowledge base for keywords — returns structured summary |
| `curate` | Promote `knowledge/draft/` entries into structured `knowledge/` files |

---

## Codebase investigation

| Command | Purpose |
|---|---|
| `survey "<topic>"` | Investigate code — searches knowledge base, consults catalogs, traces symbols; returns **Where** + **What exists** report |
| `survey --refresh` | Regenerate all codebase catalog files under `.claude/skills/code-base-survey/` |

Flags: `--output-only` (suppress agent thoughts/tool details)

---

## Code workflows

| Command | Purpose |
|---|---|
| `inspect <old> <new>` | Pre-push diff review — code quality, sensitive data, artifacts |
| `run <pipeline.json>` | Execute a pipeline of agent+script tasks (`--output-only`, `--batch`) |

---

## Pipeline task types (inside pipeline JSON)

| Type | Purpose |
|---|---|
| `agent` | Runs a Claude agent (start or resume by name) |
| `script` | Runs a shell command; can loop back to an agent on failure via `rejected.to` |
| `pipeline` | Named group of tasks — usable as a `rejected.to` target |

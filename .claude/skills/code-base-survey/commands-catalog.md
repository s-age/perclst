# CLI Commands Catalog

All `perclst` subcommands. Source of truth: `docs/USAGE.md`.

> **Freshness**: Mirrors `docs/USAGE.md`. If a command is missing or a flag differs, `docs/USAGE.md` is authoritative.

---

## Session lifecycle

| Command | Purpose |
|---|---|
| `start "<task>"` | Start a new agent session |
| `resume <session> "<instruction>"` | Resume a session with an additional instruction |
| `chat <session>` | Hand off a session to Claude Code interactively (`claude --resume`) |
| `fork <session> "<instruction>"` | Branch a session into a new independent session |
| `rewind <session> <index>` | Fork from a past turn (index 0 = current tip) |

Common flags on `start`/`resume`/`fork`: `--model`, `--procedure`, `--name`, `--label`, `--allowed-tools`, `--disallowed-tools`, `--max-messages`, `--max-context-tokens`, `--output-only`

`--label` on `start`/`fork` sets initial labels. `--label` on `resume` **appends** to existing labels (does not replace).

`rewind` flags: `--list` (show rewind points), `--length <n>` (chars per turn in list)

---

## Session management

| Command | Purpose |
|---|---|
| `list` | List all sessions |
| `show <session>` | Show session turns (flags: `--format json`, `--head`, `--tail`, `--order`, `--length`) |
| `rename <session-id> "<name>"` | Set display name; `--label <labels...>` replaces all labels at the same time |
| `tag <session> <label...>` | Set labels on a session — **replaces** all existing labels |
| `delete <session-id>` | Delete a session |
| `sweep` | Bulk-delete by date, status, name pattern, or anon-only (`--dry-run` available) |
| `import <claude-session-id>` | Import a Claude Code session into perclst management (`--name`, `--cwd`, `--label`) |

`list` flags: `--label <label>` (filter to sessions with this label), `--like <pattern>` (filter by name substring)

`sweep` flags: `--from`, `--to`, `--status`, `--like`, `--anon-only`, `--dry-run`, `--force`

---

## Analysis

| Command | Purpose |
|---|---|
| `analyze <session>` | Turn breakdown, tool usage, token stats (`--print-detail`, `--format json`) |
| `summarize` | Aggregate stats across multiple sessions — one row per session (`--label`, `--like`, `--format json`) |

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
| `inspect <old> <new>` | Pre-push diff review — code quality, sensitive data, artifacts (`-p/--prompt` for extra instruction) |
| `forge <plan-file>` | Generate an implementation pipeline from a plan file (`-p/--prompt` for extra instruction) |
| `review [target-path]` | Architectural/security/performance review of a path or pending git changes (`--output <ng_output_path>`, `-p/--prompt`) |
| `run <pipeline.json\|yaml>` | Execute a pipeline of agent+script tasks (`--output-only`, `--batch`) |

`forge` uses the `meta-pipeline-creator/create` procedure; sessions are labeled `forge`. If `target-path` is omitted from `review`, it reviews all pending git changes; sessions are labeled `review`.

`run` accepts `.json`, `.yaml`, or `.yml` files. Opens an interactive TUI by default; `--batch` disables it.

---

## Pipeline task types (inside pipeline JSON/YAML)

| Type | Purpose |
|---|---|
| `agent` | Runs a Claude agent (start or resume by name) |
| `script` | Runs a shell command; can loop back to an agent on failure via `rejected.to` |
| `pipeline` | Named group of tasks — usable as a `rejected.to` target |

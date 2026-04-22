# Usage

## Contents

### Agent Commands
Spawn a Claude agent — incur API usage and network time.

- [`start`](#start)
- [`resume`](#resume)
- [`chat`](#chat)
- [`fork`](#fork)
- [`inspect`](#inspect)
- [`curate`](#curate)
- [`survey`](#survey)
- [`retrieve`](#retrieve)
- [`run`](#run) — depends on pipeline contents

### Session Management
Local operations — no agent required.

- [`rewind`](#rewind)
- [`list`](#list)
- [`show`](#show)
- [`analyze`](#analyze)
- [`rename`](#rename)
- [`tag`](#tag)
- [`delete`](#delete)
- [`sweep`](#sweep)
- [`import`](#import)

### Reference

- [Tool Permissions](#tool-permissions)
- [Graceful Termination](#graceful-termination)
- [Output](#output)
- [Configuration](#configuration)

---

## `start`

*Agent command — spawns Claude.*

Start a new agent session.

```bash
perclst start "Implement feature X"
perclst start "task" --procedure conductor
perclst start "task" --name "my-session" --model opus
perclst start "task" --label wip auth
```

> For all options (procedures, tool permissions, output flags, etc.): `perclst start -h`

## `resume`

*Agent command — spawns Claude.*

Resume an existing session with an additional instruction.

`<session>` can be a session ID or session name.

```bash
perclst resume <session> "Continue the task"
perclst resume <session> "quick follow-up" --model haiku
perclst resume <session> "Continue" --label wip
```

`--label` appends to existing labels (does not replace).

> For all options: `perclst resume -h`

## `chat`

*Agent command — hands off to Claude Code interactively.*

Resume a session interactively in Claude Code.

`<session>` can be a session ID or session name.

```bash
perclst chat <session>
```

Hands off the terminal to `claude --resume <session-id>`. Useful when you know the session name but not the UUID.

## `fork`

*Agent command — spawns Claude.*

Branch a session into a new independent session.

`<session>` can be a session ID or session name.

```bash
perclst fork <session> "Explore an alternative approach"
perclst fork <session> "Try a different fix" --name "hotfix-attempt-2"
```

> For all options: `perclst fork -h`

## `rewind`

*Local — no agent.*

Create a new session branching from a past point in a session's conversation history.

Due to Claude Code's session design, rewind always creates a fork — the original session is never modified.

`<session>` can be a session ID or session name.

```bash
# List available rewind points (0 = most recent)
perclst rewind --list <session>
perclst rewind --list <session> --length 200   # show more chars per turn

# Create a rewind session at a given index
perclst rewind <session> 0   # fork at current tip (equivalent to fork with no prompt)
perclst rewind <session> 2   # discard the 2 most recent turns

# Then continue from the rewind point
perclst resume <session> "Try a different approach"
```

**Index semantics**: `--list` displays turns in descending order. Index `0` is the most recent assistant turn (no history is discarded). Index `N` discards the `N` most recent turns.

## `list`

*Local — no agent.*

List all sessions.

```bash
perclst list
perclst list --label survey          # sessions with label "survey"
perclst list --like "refactor"       # sessions whose name contains "refactor"
```

| Option | Description |
|--------|-------------|
| `--label <label>` | Filter to sessions that have this label |
| `--like <pattern>` | Filter to sessions whose name contains this string |

## `show`

*Local — no agent.*

Show session details.

`<session>` can be a session ID or session name.

```bash
perclst show <session>
perclst show <session> --format json      # includes thoughts and tool_history

# Filter turns
perclst show <session> --tail 30          # last 30 turns (useful for reviewing failures)
perclst show <session> --head 10          # first 10 turns
perclst show <session> --tail 30 --order desc       # last 30 rows, newest first
perclst show <session> --tail 30 --length 120       # last 30 rows, truncated to 120 chars
```

| Option | Description |
|--------|-------------|
| `--head <n>` | Show first N rows |
| `--tail <n>` | Show last N rows |
| `--order <asc\|desc>` | Row display order (default: `asc`) |
| `--length <n>` | Truncate content to N characters (default: full) |

## `analyze`

*Local — no agent.*

Turn breakdown, tool usage, and token stats from a Claude Code jsonl session.

`<session>` can be a session ID or session name.

```bash
perclst analyze <session>
perclst analyze <session> --print-detail   # full turn content
perclst analyze <session> --format json
```

## `rename`

*Local — no agent.*

Set a display name for a session. Optionally replace its labels at the same time.

```bash
perclst rename <session-id> "new-name"
perclst rename <session-id> "new-name" --label wip refactor
```

| Option | Description |
|--------|-------------|
| `--label <labels...>` | Replace session labels with these values |

## `tag`

*Local — no agent.*

Set labels on a session. Replaces all existing labels.

```bash
perclst tag <session> wip
perclst tag <session> wip refactor auth
```

To add labels without replacing existing ones, use `resume --label` instead.

## `delete`

*Local — no agent.*

Delete a single session.

```bash
perclst delete <session-id>
```

## `sweep`

*Local — no agent.*

Bulk-delete sessions matching a set of filters. At least one filter option is required. Date filters operate on `created_at`.

```bash
# Preview what would be deleted (no changes made)
perclst sweep --from 2025-01-01 --to 2025-03-31 --dry-run

# Delete by date range
perclst sweep --from 2025-01-01 --to 2025-03-31

# Open-ended range (--to omitted) requires --force
perclst sweep --from 2025-01-01 --force

# Filter by status
perclst sweep --from 2025-01-01 --to 2025-03-31 --status completed

# Filter by name (partial match)
perclst sweep --from 2025-01-01 --to 2025-03-31 --like "experiment"

# Delete all anonymous sessions (no name set)
perclst sweep --anon-only --dry-run
perclst sweep --anon-only --force

# Combine filters
perclst sweep --to 2025-03-31 --status completed --anon-only
```

| Option | Description |
|---|---|
| `--from <YYYY-MM-DD>` | Sessions created on or after this date |
| `--to <YYYY-MM-DD>` | Sessions created on or before this date |
| `--status <status>` | Filter by status: `active`, `completed`, `failed` |
| `--like <pattern>` | Filter by name (partial match) |
| `--anon-only` | Only sessions with no name (incompatible with `--like`) |
| `--dry-run` | Preview matched sessions without deleting |
| `--force` | Required when `--to` is omitted |

## `inspect`

*Agent command — spawns Claude.*

Run a pre-push code inspection between two git refs. Spawns a sonnet agent that reviews the diff for code quality issues, sensitive data leaks, and unintentional artifacts.

```bash
perclst inspect <old> <new>
perclst inspect main HEAD
perclst inspect abc1234 def5678
perclst inspect main HEAD -p "日本語で答えて"
perclst inspect main HEAD --prompt "be brief, summary only"
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <prompt>` | Additional instruction appended to the inspection prompt |

Sessions created by this command are automatically labeled `inspect`.

The agent produces a report like:

```
## Inspection Report

### Summary
✗ 2 issue(s) found

### Findings
[WARNING] src/lib/agent.ts:42 — debug console.log left in
[INFO]    src/config/default.ts:10 — TODO comment

### Verdict
Push approved.
```

If `CRITICAL` findings are present (API key, personal data leak, etc.), the report ends with **Push blocked**.

---

## `curate`

*Agent command — spawns Claude.*

Promote all `knowledge/draft/` entries into structured `knowledge/` files. Shorthand for running the `meta-curate-knowledge` procedure with the required tool permissions.

```bash
perclst curate
```

Sessions created by this command are automatically labeled `curate`.

Equivalent to:

```bash
perclst start "Promote all entries in knowledge/draft/ into structured knowledge/ files." \
  --procedure meta-curate-knowledge \
  --allowed-tools Write Read Bash Glob \
  --output-only
```

## `survey`

*Agent command — spawns Claude.*

Survey the codebase for bug investigation or pre-implementation research. Spawns a sonnet agent that searches the knowledge base, consults layer catalogs, and traces symbols to answer: **where is the relevant code?** and **what already exists that could be reused?**

Sessions created by this command are automatically labeled `survey`.

```bash
# Investigate a topic
perclst survey "セッション管理のバグを調べたい"
perclst survey "pipeline rejection の仕組みを教えて"

# Show only the final report
perclst survey "AuthService 周りの実装" --output-only

# Refresh codebase catalogs (re-scans utils, infra, domains, MCP tools, commands)
perclst survey --refresh
```

The agent returns a structured report with two sections:
- **Where** — layer, file, and symbol where relevant code lives
- **What exists** — reuse candidates with rationale

---

## `retrieve`

*Agent command — spawns Claude.*

Search the project knowledge base for one or more keywords and return a structured summary of findings. Shorthand for running the `meta-retrieve-knowledge` procedure with `--output-only`.

Sessions created by this command are automatically labeled `retrieve`.

```bash
perclst retrieve "keyword"
perclst retrieve "keyword1" "keyword2" "keyword3"
```

Use this before starting a design or implementation task to surface prior decisions, gotchas, and patterns recorded in `knowledge/`.

Equivalent to:

```bash
perclst start "Search the knowledge base for the following keywords and return a structured summary of findings: keyword1, keyword2" \
  --procedure meta-retrieve-knowledge \
  --output-only
```

> `--output-only` is not a CLI flag on `retrieve` — it is applied internally. `perclst retrieve "kw" --output-only` will error.

## `run`

*Hybrid — spawns agents only if the pipeline includes agent tasks.*

Execute a pipeline of agent tasks defined in a JSON file. Tasks run serially. If a task specifies a `name` and a session with that name already exists, the task resumes that session; otherwise a new session is created.

**Pipeline JSON Schema**: [`schemas/pipeline.schema.json`](../schemas/pipeline.schema.json) — add `"$schema": "../schemas/pipeline.schema.json"` to a pipeline file for editor autocompletion and validation.

```bash
perclst run pipeline.json
perclst run pipeline.json --output-only
perclst run pipeline.json --batch   # disable TUI (plain text output)
```

By default, `run` opens an interactive TUI: the left pane tracks task progress, the right pane streams each task's output, and permission requests appear in the bottom pane. The TUI is automatically disabled when `--batch` is specified or when stdout is not a TTY (e.g. CI, piped output).

Two task types are supported: `agent` and `script`.

**Agent task** — runs a Claude agent session:

```json
{
  "tasks": [
    {
      "type": "agent",
      "name": "unit-test-domains-analyze",
      "task": "target_file_path: src/domains/analyze.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    },
    {
      "type": "agent",
      "name": "unit-test-domains-checker",
      "task": "target_file_path: src/domains/checker.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    },
    {
      "type": "agent",
      "name": "unit-test-domains-import",
      "task": "target_file_path: src/domains/import.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    }
  ]
}
```

Session lookup uses the most recently updated session with the given name — a second run of this pipeline resumes each session instead of starting fresh.

**Agent task fields** (all optional except `type` and `task`):

| Field | Description |
|---|---|
| `name` | Session name. Found → resume. Not found → start with this name. Omitted → always start new. |
| `procedure` | Procedure name (only applied on start, ignored on resume) |
| `model` | Model override for this task |
| `allowed_tools` | Tools to allow without prompting |
| `disallowed_tools` | Tools to deny |
| `max_turns` | Turn limit before graceful termination |
| `max_context_tokens` | Context token limit before graceful termination |

---

**Script task** — runs a shell command. If it fails (non-zero exit code) and `rejected` is set, the pipeline loops back to the named agent task with the script output as feedback:

```json
{
  "tasks": [
    {
      "type": "agent",
      "name": "unit-test-domains-analyze",
      "task": "target_file_path: src/domains/analyze.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    },
    {
      "type": "agent",
      "name": "unit-test-domains-checker",
      "task": "target_file_path: src/domains/checker.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    },
    {
      "type": "agent",
      "name": "unit-test-domains-import",
      "task": "target_file_path: src/domains/import.ts",
      "procedure": "test-unit",
      "allowed_tools": ["Read", "Write", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
    },
    {
      "type": "script",
      "command": "npm run test:unit",
      "rejected": {
        "to": "unit-test-domains-checker",
        "max_retries": 2
      }
    }
  ]
}
```

When `npm run test:unit` fails, the pipeline loops back to `unit-test-domains-checker` and resumes that session with a `[Retry N]` instruction containing the test output. After `max_retries` exhausted, the pipeline stops with a non-zero exit code.

**Script task fields**:

| Field | Description |
|---|---|
| `command` | Shell command to run (executed in the current working directory) |
| `rejected.to` | Name of the agent or pipeline task to loop back to on failure |
| `rejected.max_retries` | Maximum number of rejection loops before aborting (default: 1) |

---

**Pipeline task** — a named group of tasks that runs as a unit. Useful when a `script` rejection needs to retry a multi-agent sequence rather than a single agent:

```json
{
  "type": "pipeline",
  "name": "unit-test-analyze-service",
  "tasks": [...]
}
```

`rejected.to` on a script task can reference a pipeline `name`, causing the entire nested pipeline to re-run on failure.

**Agent-level rejection** inside a nested pipeline is done via `ng_output_path`: the review agent writes rejection feedback to a temp file, and the pipeline loops back to the implement agent when that file is present.

**Real-world example** (`pipelines/unit-test-services-analyze.json`):

```json
{
  "tasks": [
    {
      "type": "script",
      "command": "npm run test:unit"
    },
    {
      "type": "pipeline",
      "name": "unit-test-analyze-service",
      "tasks": [
        {
          "type": "agent",
          "name": "implement-unit-test-analyze-service",
          "task": "target_file_path: src/services/analyzeService.ts",
          "procedure": "implement-unit-test",
          "model": "haiku",
          "allowed_tools": ["Read", "Write", "Edit", "Bash", "mcp__perclst__ts_test_strategist", "mcp__perclst__ts_checker"]
        },
        {
          "type": "agent",
          "name": "review-unit-test-analyze-service",
          "task": "target_file_path: src/services/analyzeService.ts\nng_output_path: .claude/tmp/review-unit-test-analyze-service",
          "procedure": "review-unit-test",
          "model": "haiku",
          "allowed_tools": ["Read", "Bash", "mcp__perclst__ts_test_strategist"],
          "rejected": {
            "to": "implement-unit-test-analyze-service",
            "max_retries": 3
          }
        }
      ]
    },
    {
      "type": "script",
      "command": "npm run test:unit",
      "rejected": {
        "to": "unit-test-analyze-service",
        "max_retries": 3
      }
    },
    {
      "type": "agent",
      "name": "implement-unit-test-analyze-service",
      "task": "All tests pass and the review is complete. Commit your changes.",
      "model": "haiku",
      "allowed_tools": ["Read", "Write", "Edit", "Bash"]
    }
  ]
}
```

This pipeline runs as follows:

1. **Pre-check** — `npm run test:unit` runs first. If it already passes (e.g. tests were written in a prior run), the implement/review loop is skipped.
2. **Nested pipeline** — implement → review loop. The review agent signals rejection via `ng_output_path`; if rejected, it loops back to the implement agent (up to 3 times).
3. **Post-check** — `npm run test:unit` re-runs. If it fails, the entire nested pipeline re-runs (up to 3 times).
4. **Commit** — once tests pass, the implement agent commits the changes.

**Pipeline task fields**:

| Field | Description |
|---|---|
| `name` | Identifier for the pipeline group — used as the target for `rejected.to` |
| `tasks` | Array of agent and/or script tasks to run in order |

> For all options: `perclst run -h`

The `pipelines/` directory in this repository contains the pipelines used in perclst's own development — unit-test generation, code review loops, and refactoring workflows. These are real operational examples, not toy samples.

## `import`

*Local — no agent.*

Import an existing Claude Code session into perclst management.

```bash
perclst import <claude-session-id>
perclst import <claude-session-id> --name "My session"
perclst import <claude-session-id> --cwd /path/to/working/dir
perclst import <claude-session-id> --label wip legacy
```

---

## Tool Permissions

Use `--allowed-tools` and `--disallowed-tools` to control which Claude Code built-in tools the agent can use without prompting. Available on `start`, `resume`, and `fork`.

```bash
perclst start "read and analyze code" --allowed-tools Read Glob Grep
perclst start "read-only task" --disallowed-tools Bash Edit Write
perclst resume <session-id> "continue" --allowed-tools WebFetch --disallowed-tools Bash
```

Defaults can be set in config (CLI flags override config values for that invocation):

```json
{
  "allowed_tools": ["WebFetch", "WebSearch"],
  "disallowed_tools": ["Bash"]
}
```

---

## Graceful Termination

Use `--max-turns` or `--max-context-tokens` to automatically stop an agent run and request a summary when limits are reached. Available on `start`, `resume`, and `fork`.

```bash
perclst start "long task" --max-turns 20
perclst start "long task" --max-context-tokens 150000
perclst resume <session-id> "continue" --max-turns 20 --max-context-tokens 150000
```

When a limit is reached, perclst automatically sends a follow-up prompt asking the agent to summarize what was completed and what remains unfinished.

Defaults can be set in config (`-1` = disabled):

```json
{
  "limits": {
    "max_turns": -1,
    "max_context_tokens": -1
  }
}
```

---

## Output

Each `start` / `resume` run prints an output block like this:

```
--- Thoughts ---
<thinking content>

--- Tool Calls ---
[mcp__perclst__ts_checker] input: {}
         result: { "ok": true, ... }

--- Agent Response ---
<final response text>

--- Token Usage ---
  Messages:         4
  Input:            18
  Output:           626
  Cache read:       51,631
  Cache creation:   9,096
  Context window:   30,635 / 200,000 (15%)
```

**Token Usage notes**:
- **Messages** — number of API messages exchanged (user prompts + assistant responses + tool round-trips)
- **Input / Output / Cache read / Cache creation** — cumulative token counts across all API calls in the run
- **Context window** — token count of the final API call's context (input side only). Claude Code's
  built-in tool infrastructure consumes a fixed baseline of approximately **30,000 tokens** regardless
  of task content. On `resume`, the context window is structurally smaller (~20K) due to a known
  Claude Code bug — see [context-window-on-resume.md](context-window-on-resume.md) for details.

---

## Configuration

**Priority**: `./.perclst/config.json` > `~/.perclst/config.json` > defaults

```json
{
  "sessions_dir": "~/.perclst/sessions",
  "logs_dir": "~/.perclst/logs",
  "model": "claude-sonnet-4-5",
  "allowed_tools": [],
  "disallowed_tools": [],
  "limits": {
    "max_turns": -1,
    "max_context_tokens": -1
  }
}
```

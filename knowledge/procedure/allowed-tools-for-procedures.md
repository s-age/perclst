# Allowed Tools Checklist for Procedure Commands

**Type:** Discovery

## Context

When wiring a CLI command (e.g. `inspect`, `survey`) that calls `startCommand` with a `procedure`
argument, the `allowedTools` array must be derived from what the procedure actually does — not just
guessed from the command's primary purpose or from the MCP tools it queries.

## What happened / What is true

Three categories of tools are commonly missed:

- **`Skill`** is required if the procedure's `.md` file contains the phrase
  `Consult the \`<name>\` skill`. The agent invokes the `Skill` tool to load skill content at
  runtime; if `Skill` is absent from `allowedTools`, the agent stalls on a permission prompt.

- **`Write`** is required if the procedure can write files — e.g. writing to `knowledge/draft/`
  or overwriting catalog files. Even a single write step means `Write` must be included.

- **`mcp__perclst__knowledge_search`** is required if the procedure starts with a knowledge-base
  search step. This tool is an MCP call and is not implicitly allowed.

Known cases where tools were missing (fixed 2026-04-22):

| Command | Procedure | Missing tools |
|---|---|---|
| `inspect` | `code-inspector` | `Skill`, `mcp__perclst__knowledge_search` |
| `survey` | `code-base-survey` | `Skill`, `Write` |
| `survey --refresh` | `code-base-survey-refresh` | `Skill` |

## Do

- Before finalising `allowedTools` for a new command, open the procedure `.md` and check:
  - Does it say "Consult the X skill"? → add `Skill`
  - Does its flowchart include a Write step? → add `Write`
  - Does it call `knowledge_search`? → add `mcp__perclst__knowledge_search`
- Treat the procedure file as the source of truth for required tools.

## Don't

- Don't derive `allowedTools` only from the MCP tools listed in CLAUDE.md — the procedure file
  may require additional Claude-native tools (`Skill`, `Write`, `Edit`, etc.).
- Don't assume `Skill` is implicitly allowed; it requires an explicit entry.

---

**Keywords:** allowedTools, procedure, Skill tool, Write tool, knowledge_search, permission prompt, startCommand, CLI command wiring

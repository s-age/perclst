# Write/Edit Blocked for `.claude/` Subdirectories in Sub-Agents

**Type:** Problem

## Context

Applies whenever a sub-agent (spawned via `perclst start` or `claude -p`) is given `Write` or
`Edit` in its `allowedTools` list and attempts to write files inside `.claude/` subdirectories
(e.g. `.claude/skills/`, `.claude/catalogs/`). This does not affect writes to other directories
such as `knowledge/`.

## What happened / What is true

- Claude Code requires interactive TTY confirmation before overwriting files inside `.claude/`.
- Sub-agents run without a TTY; the confirmation prompt fails immediately with
  `"No terminal available for interactive prompt"`.
- `knowledge/` and other directories outside `.claude/` are unaffected — Write/Edit work normally there.
- The agent can work around the restriction by writing via Bash, but only discovers this after
  wasting multiple turns.
- Observed cost: ~138 messages and ~45 % context consumed for a catalog refresh that should be cheap.

## Do

- Pre-warn sub-agents in the relevant procedure: _"If Write or Edit fails with
  'No terminal available', use Bash to write the file instead."_
- Alternatively, move catalog or generated files out of `.claude/` (e.g. into `catalogs/`)
  so that Write/Edit work without the TTY restriction.

## Don't

- Don't assume `allowedTools: ['Write', 'Edit']` is sufficient for `.claude/` subdirectory
  writes when the agent runs headless (no TTY).
- Don't rely on the agent self-discovering the Bash workaround — it wastes turns and tokens.

---

**Keywords:** Write blocked, Edit blocked, .claude directory, sub-agent, no terminal, TTY, allowedTools, headless, survey refresh

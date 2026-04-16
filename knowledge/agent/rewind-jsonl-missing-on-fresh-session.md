# Rewind Session: No JSONL File on Fresh Session

**Type:** Problem

## Context

When `createRewindSession` is called it assigns a brand-new UUID to
`claude_session_id`. No JSONL file under `~/.claude/projects/` exists for
that UUID until the session is first resumed via `claude -p --resume`. Any
code that reads the Claude Code JSONL by looking up `session.claude_session_id`
directly will throw on a fresh rewind session before that first resume.

## What happened / What is true

- `createRewindSession` sets `claude_session_id` to a fresh UUID.
- The JSONL file for that UUID does not exist until `claude -p --resume` is
  called for the first time.
- Accessing the JSONL via `claude_session_id` directly throws
  `Claude Code session file not found`.
- The source JSONL to read is the one belonging to
  `rewind_source_claude_session_id` (the original session being branched from).
- `getRewindTurns` already resolved this correctly; `analyze` was the case
  that was missing the fallback.

## Do

- Use `rewind_source_claude_session_id ?? claude_session_id` whenever
  resolving which JSONL file to read for a session.

## Don't

- Don't assume `claude_session_id` points to an existing JSONL file for a
  rewind session that has not yet been resumed.

---

**Keywords:** rewind, JSONL, claude_session_id, rewind_source_claude_session_id, session file not found, analyze, getRewindTurns

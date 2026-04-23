# summarize() Uses Best-Effort Aggregation Over Sessions

**Type:** Discovery

## Context

`AnalyzeDomain.summarize()` aggregates token and turn stats across a filtered
set of sessions by reading each session's JSONL file. Sessions may be absent
from the filesystem even though they exist in the DB.

## What happened / What is true

- Sessions can exist in the DB without a corresponding JSONL file: the file
  may have been deleted, the session may have never produced output, or the
  working directory recorded on the session may differ from the current one.
- `summarize()` wraps each `readSession()` call in a `try/catch` that silently
  skips any session that throws.
- The aggregate result reflects only the sessions whose JSONL files were
  successfully read — no error is surfaced to the caller.
- This is intentional: a missing file for one session should not abort the
  entire summary operation.

## Do

- Treat `summarize()` output as a best-effort count — it may undercount if
  some session files are missing.
- Apply `rewind_source_claude_session_id ?? claude_session_id` (see
  `agent/rewind-jsonl-missing-on-fresh-session.md`) before calling
  `readSession()` to maximise hit rate on rewind sessions.

## Don't

- Don't expect `summarize()` to throw when individual sessions are unreadable.
- Don't rely on the session count in the result matching the number of DB rows
  if JSONL files may be absent.

---

**Keywords:** summarize, best-effort, silent catch, aggregation, missing JSONL, AnalyzeDomain, SessionSummaryStats

# Rewind: Deferred Fork Design

**Type:** Discovery

## Context

The `perclst rewind` command must branch a session back to an earlier point
without requiring the user to supply a new prompt at rewind time. This
requires a two-phase approach: record intent now, materialize the fork later.

## What happened / What is true

- `perclst rewind` stores metadata in the session file and exits without
  invoking Claude Code.
- The actual `--fork-session` call is deferred to the first `perclst resume`
  on that session.
- Two fields are persisted in the session file:
  - `rewind_source_claude_session_id` — the Claude session ID to fork from
  - `rewind_to_message_id` — the UUID to pass to `--resume-session-at`
    (omitted when rewinding to the very beginning, i.e. index 0)
- When `agentService.resume()` detects these fields it issues:
  ```bash
  claude -p --resume <source-id> --fork-session --session-id <new-id> \
         [--resume-session-at <msg-uuid>]
  ```
- After a successful fork, both fields are cleared and the session file is
  saved. Subsequent resumes behave as normal `--resume <new-id>` calls.

**Why deferred:** At rewind time the user has not yet decided what to ask
next, so there is nothing to pass as a prompt. Deferring preserves the
branching point without forcing an immediate interaction.

## Do

- Clear `rewind_source_claude_session_id` and `rewind_to_message_id` from
  the session after the fork succeeds
- Handle the case where `rewind_to_message_id` is absent (rewind to start)
  by omitting `--resume-session-at` entirely

## Don't

- Don't invoke Claude Code during `rewind` itself — only record intent
- Don't leave the rewind fields set after a successful fork; they will
  trigger another fork on the next resume

---

**Keywords:** rewind, deferred fork, fork-session, resume-session-at, session metadata, lazy fork, agentService

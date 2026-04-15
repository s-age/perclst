# Pending Rewind Sessions Break `--list` Turn Display

**Type:** Problem

## Context

After `perclst rewind` is called but before `perclst resume` materializes
the fork, the new session exists in perclst's session store but has no
corresponding Claude Code JSONL file. Naively reading the JSONL by new
session ID will fail or show empty turns.

## What happened / What is true

- A pending rewind session has `rewind_source_claude_session_id` set to the
  *original* Claude session ID.
- Until the first `perclst resume`, only the *source* JSONL file exists.
- `rewind_to_message_id`, if set, marks the cutoff: turns after that UUID
  are history that the rewind discards.

Two invariants must hold during `--list` for a pending rewind session:
1. Read turns from the **source** JSONL (identified by
   `rewind_source_claude_session_id`), not from the new session ID.
2. If `rewind_to_message_id` is set, slice the turn list so only turns up
   to and including that UUID are shown.

After the fork is materialized, `rewind_source_claude_session_id` is
cleared, and the display reverts automatically to the session's own JSONL.

## Do

- When displaying turns for a session, check for
  `rewind_source_claude_session_id`; if present, load turns from the source
  JSONL instead
- Apply `rewind_to_message_id` as an upper-bound slice on the loaded turns

## Don't

- Don't attempt to open a JSONL file by new session ID when
  `rewind_source_claude_session_id` is still set — the file does not exist
  yet
- Don't show turns beyond `rewind_to_message_id`; they represent history
  that the rewind intentionally discards

---

**Keywords:** rewind, pending session, list, JSONL, rewind_source_claude_session_id, rewind_to_message_id, display, turn slice

# Single-Pass JSONL Parsing: tool_result Collection Order

**Type:** Discovery

## Context

Applies to `readSessionFromRaw` in `claudeSessionScanner.ts`. Relevant whenever implementing or modifying a single-pass JSONL parser that resolves `tool_use` → `tool_result` mappings from Claude session files.

## What happened / What is true

Claude Code JSONL has a fixed ordering: an assistant entry (containing `tool_use` blocks) is always followed by a user entry containing the matching `tool_result` blocks.

In a single-pass parser the user entry must be processed to collect `tool_result` values into the map **before** flushing the pending assistant group. If the flush happens first, assistant entries cannot resolve their tool_use → tool_result mappings.

When `upToMessageId` is set:
- Assistant entries **after** the cutoff must use `continue` (not `break`), because the following user entry still needs to be processed to collect tool_results for the cutoff group.
- `break` is only correct when a **user** entry is encountered after the cutoff has been reached.

This single-pass approach replaced the earlier two-pass approach (`parseRawEntries` → `buildToolResultMap` → `buildTurns`) that materialized all entries as `RawEntry[]`.

## Do

- Collect tool_results from the user entry into the map first, then flush the pending assistant group.
- Use `continue` for assistant entries that appear after the `upToMessageId` cutoff.
- Use `break` only on a user entry encountered after the cutoff.

## Don't

- Don't flush the assistant group before processing the following user entry's tool_results.
- Don't `break` on an assistant entry after the cutoff — the next user entry may carry required tool_results.

---

**Keywords:** JSONL, single-pass, tool_result, tool_use, readSessionFromRaw, claudeSessionScanner, upToMessageId, cutoff, session parsing

# Rewind Session: Apply Cutoff at Raw-Entry Level, Not Turn Level

**Type:** Discovery

## Context

When replaying a rewind session up to `rewind_to_message_id`, the entry list
must be filtered *before* `buildToolResultMap` and `buildTurns` are called.
In the Claude Code JSONL format, tool results live in `user`-type entries
immediately after the `assistant` entry that issued the tool call.

## What happened / What is true

- `rewind_to_message_id` is the UUID of an `assistant`-type JSONL entry.
- Tool results for that assistant turn are stored in the next `user` entry as
  `tool_result` blocks — they are logically part of the same turn.
- If the cutoff is applied after building turns (i.e., at the turn level),
  `buildToolResultMap` has already scanned all entries including post-cutoff
  ones, so results from tool calls beyond the cutoff pollute the map.
- Correct approach: filter `entries` before calling `buildToolResultMap` and
  `buildTurns`. Include the immediately-following `user` entry when it
  contains `tool_result` blocks, because those results belong to the cutoff
  assistant turn.
- This logic is implemented in `filterEntriesUpTo` in
  `src/repositories/claudeSessions.ts`.

## Do

- Filter raw JSONL entries with `filterEntriesUpTo` before passing them to
  `buildToolResultMap` and `buildTurns`.
- Include the trailing `user` entry when its content is solely `tool_result`
  blocks (it is the completion of the cutoff assistant turn).

## Don't

- Don't apply the cutoff after building turns — post-cutoff tool results will
  already be in the result map and corrupt the replayed conversation.

---

**Keywords:** rewind, cutoff, filterEntriesUpTo, buildToolResultMap, buildTurns, JSONL, tool_result, entry-level filtering, rewind_to_message_id

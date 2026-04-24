# ParseState OOM — Sliding Window Fix

**Type:** Problem

## Context

Applies to long-running pipeline tasks (50+ minutes) that drive a single agent turn.
`ParseState` accumulates structured output (thoughts, tool calls) for the duration of
the turn, and without a bound this causes heap exhaustion on large workloads.

## What happened / What is true

- A prior fix (28ad2b3) eliminated the raw `lines[]` buffer, but `thoughts[]` and
  `toolMap` inside `ParseState` still grew without bound for the full duration of a task.
- On workloads lasting 50+ minutes, this exhausted the 4 GB Node heap.
- **Fix**: cap both `thoughts` and `toolMap` at **200 entries** using a sliding window
  (oldest entry evicted first).
- **Why sliding window, not "lightweight mode"**: a lightweight mode that conditionally
  skips accumulation when `onStreamEvent` is active only protects the streaming path.
  A hard cap applies unconditionally — `--output-only`, `--format json`, and streaming
  all get the same memory protection with simpler, fewer-branch code.

## Do

- Cap `thoughts[]` and `toolMap` at 200 entries; evict the oldest when the limit is reached.
- Apply the cap unconditionally, regardless of whether streaming is active.
- Keep `message_count`, `assistantEventCount`, and `userToolResultEventCount` **uncapped**
  — they count all events and must not lose history even when their associated data is evicted.

## Don't

- Don't use a conditional "lightweight mode" that skips accumulation only during streaming —
  it leaves non-streaming modes unprotected and adds branching complexity.
- Don't cap event counters (`message_count`, etc.) alongside the data collections — the
  turn-limit enforcement logic depends on accurate counts for every event seen.

---

**Keywords:** ParseState, OOM, out-of-memory, heap, sliding window, memory leak, long-running, thoughts, toolMap, message_count, streaming, output-only

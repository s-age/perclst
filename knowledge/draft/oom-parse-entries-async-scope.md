# OOM: parseRawEntries inside async dispatch keeps all entries live

## Problem

`perclst run` on long pipelines crashed with `FATAL ERROR: Ineffective mark-compacts near heap limit` at ~4 GB.

Stack trace showed `Builtins_ArrayMap` at the top of the JS frames — this was `parseRawEntries` in `claudeSessionParser.ts`, which called `.map(line => JSON.parse(line))` to build a full `RawEntry[]`.

## Root cause

`computeMessagesTotalFromContent` called `parseRawEntries` → `buildToolResultMap` → `buildTurns`, materialising thousands of parsed JSON objects simultaneously. For a large JSONL (long session with many tool calls), this could be hundreds of MB of heap.

The objects couldn't be GC'd because `agentRepository.dispatch` is an `async` function containing a `for await` loop. V8 suspends the function as a continuation object, keeping all local variables in scope — including `jsonlContent` (the raw string) and all the intermediate arrays — for the entire duration of the claude subprocess run.

## Fix

Replaced `computeMessagesTotalFromContent` with a single-pass line scanner:
parse one entry at a time, accumulate only scalar counters, let each parsed object go out of scope at the end of the loop body. Memory stays O(1) regardless of JSONL size.

## Diagnostic pattern

`Builtins_ArrayMap` in a Node OOM stack trace → find the `.map()` call in the JS frames above it → check if the result array is kept live by an enclosing async function's continuation scope.

## Related files

- `src/repositories/parsers/claudeSessionParser.ts` — `computeMessagesTotalFromContent`
- `src/repositories/agentRepository.ts` — `dispatch`, where the long-lived scope is

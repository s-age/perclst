# OOM: Large Arrays Inside Async Functions Keep Heap Live

**Type:** Problem

## Context

`perclst run` on long pipelines crashed with
`FATAL ERROR: Ineffective mark-compacts near heap limit` at ~4 GB.
Stack trace showed `Builtins_ArrayMap` — tracing back to `parseRawEntries` in
`claudeSessionParser.ts`.

## Root cause

`computeMessagesTotalFromContent` called `parseRawEntries` → `buildToolResultMap` →
`buildTurns`, materialising thousands of parsed JSON objects simultaneously.

V8 compiles async functions as continuation state machines. All local variables declared
before the first `await` / `for await` remain reachable as long as the frame exists —
even after the code that uses them has run. In `agentRepository.dispatch`, the large
`jsonlContent` string and all intermediate arrays were kept live for the entire duration
of the `claude` subprocess (minutes).

## Fix

Replace `computeMessagesTotalFromContent` with a single-pass line scanner: parse one
entry at a time, accumulate only scalar counters, let each object go out of scope at the
end of the loop iteration. Memory stays O(1) regardless of JSONL size.

## Diagnostic pattern

`Builtins_ArrayMap` in a Node.js OOM trace → find the `.map()` call in the JS frames →
check whether the result array is kept alive by an enclosing async function's
continuation scope.

## Do

- Extract heavy data reads into a separate synchronous helper so the large allocation
  is freed before the long-running `for await` loop begins.

## Don't

- Materialize large arrays inside an `async` function that also contains a long-running
  `for await` loop.

---

**Keywords:** OOM, async scope, V8 continuation, parseRawEntries, for await, heap, ArrayMap, memory leak

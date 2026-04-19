# PipelineService: Cannot yield retry events from private non-generator methods

**Type:** Problem

## Context

In `src/services/pipelineService.ts`, the methods `handleAgentRejection` and
`handleScriptRejection` are private, non-generator methods. This becomes a
problem when you need to emit `retry` progress events from inside those methods,
because only generator functions can use `yield`.

## What happened / What is true

- `run()` is an async generator; it can `yield` progress events directly.
- `handleAgentRejection` / `handleScriptRejection` are plain `private` methods —
  they cannot `yield`, so any progress event produced there is silently lost.
- Two workarounds exist:
  1. **Callback**: add `onProgress?: (event: ProgressEvent) => void` to the
     private methods and call it from within them; `run()` passes its own
     yield-wrapper as the callback.
  2. **Inline**: move the rejection-check logic into `run()`'s `while` loop so
     it runs in generator scope and can `yield` directly.
- Inlining is type-simpler and removes the indirection, but makes `run()` longer.

## Do

- Prefer inlining rejection logic into `run()`'s loop when the logic is short
  and the progress event is essential to callers.
- If the rejection logic is complex enough to justify its own method, use the
  `onProgress` callback pattern and document the contract clearly.

## Don't

- Don't attempt to `yield` from a private non-generator helper — it won't
  compile and the intent will be opaque to future readers.
- Don't silently drop retry events; callers rely on them to display progress.

---

**Keywords:** PipelineService, yield, generator, retry, progress event, handleAgentRejection, handleScriptRejection, private method

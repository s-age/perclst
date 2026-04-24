# Pipeline `done` Flag Interferes with Rejection Retry Loop

**Type:** Problem

## Context

Applies to `PipelineService.run()` in the pipeline execution layer. The `done` flag on tasks serves crash-recovery (skip already-completed tasks on restart). The rejection/retry loop uses `jumpTo` to re-run a task — but `done` gates whether the task actually executes.

## What happened / What is true

- `onTaskDone` in `run.ts` sets `task.done = true` after each task completes, enabling crash recovery.
- The rejection/retry loop in `PipelineService.run()` jumps back to a target task index via a `jumpTo` value returned by `processTask`.
- If the jump target was already marked `done`, the task is skipped — the agent never receives the rejection feedback.
- The bug was invisible in unit tests because `onTaskDone` was mocked as `vi.fn()` (no-op), so `done` was never set to `true` during test execution. Only the real `markTaskDone` in `run.ts` triggers the interaction.

## Do

- Clear `done = false` on the jump target whenever `processTask` returns a `jumpTo` value.
- Write functional mocks for `onTaskDone` that set `done = true`, matching production mutation behavior.
- Write `resolveScriptRejection` mocks that return real `RejectionResult` values to expose interaction bugs.

## Don't

- Don't mock `onTaskDone` as a no-op `vi.fn()` — it hides state-mutation bugs involving the `done` flag.
- Don't assume crash-recovery flags and retry-gating flags can share the same field without coordination.

---

**Keywords:** pipeline, done flag, retry, jumpTo, crash recovery, onTaskDone, rejection, vi.fn, mock, PipelineService, run.ts, markTaskDone

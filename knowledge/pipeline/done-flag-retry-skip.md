# Done Flag Clears Rejection Retry

**Type:** Problem

## Context

Applies when `PipelineService.run()` processes a `jumpTo` returned by `processTask` — i.e., when a task is rejected and the loop must retry from an earlier index. The `done` flag is used for crash-recovery (skip already-completed tasks on restart) and is set by `onTaskDone` in `run.ts`.

## What happened / What is true

The rejection/retry loop in `PipelineService.run()` jumped back to a target task index, but if `onTaskDone` had already set `done = true` on that task, the scheduler treated it as completed and skipped it — so the agent never received the rejection feedback.

The bug was invisible in unit tests because `onTaskDone` was mocked as `vi.fn()` (no-op), meaning `done` was never mutated to `true` during test execution. Only the real `markTaskDone` in `run.ts` triggers the interaction.

Fix: clear `done = false` on the `jumpTo` target task when `processTask` returns a `jumpTo` value. This keeps `done` as the single source of truth for "should this task run."

## Do

- Clear `done = false` on the jump target immediately after resolving a `jumpTo` value
- Use the real `onTaskDone` callback (or a functional stub) in tests that exercise the retry/rejection loop

## Don't

- Don't mock `onTaskDone` as a no-op in tests that cover retry paths — it hides the mutation
- Don't rely on task index alone to decide whether to run a task; always check `done`

---

**Keywords:** done flag, retry, rejection, jumpTo, pipeline, crash recovery, onTaskDone, markTaskDone, skip, loop

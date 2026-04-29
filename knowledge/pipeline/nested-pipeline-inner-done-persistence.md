# Nested Pipeline: Inner task.done Flags Not Reset on Retry

**Type:** Problem

## Context

When a nested pipeline (`type: 'pipeline'`) is the target of a rejection jump,
`pipelineService.ts` resets the outer task's `done` flag but does not reset the `done` flags
of the inner tasks. This causes the retry pass to silently skip all inner agents.

## What happened / What is true

- `pipelineService.ts` L90 resets `pipeline.tasks[jumpTo].done = false` on rejection jump.
- `task.tasks[*].done` (inner tasks of the nested pipeline) remain `true` from the prior run.
- On retry, `runNestedPipeline` calls `this.run({ tasks: task.tasks }, ...)` with the same
  array. The inner while loop sees `task.done === true` and skips all inner tasks immediately.
- `outerRejection` is correctly set via `findOuterRejectionTarget` + `pendingRejections.set()`,
  but the target agent is never re-executed because it is skipped by the done check.
- The retry appears to succeed (no error thrown), but no inner agent actually re-runs — the
  rejection context is silently lost.
- This is current production behavior as of the time of discovery.

## Do

- When adding retry logic that targets a nested pipeline, also reset `task.tasks[*].done = false`
  for all inner tasks of the jump target
- Add an integration test that verifies inner agents re-execute after a nested pipeline rejection,
  not just that the outer retry completes without error

## Don't

- Don't assume resetting the outer `done` flag is sufficient for nested pipelines
- Don't interpret a clean, error-free retry pass as proof of correctness when inner tasks carry
  `done: true` from a prior run

---

**Keywords:** nested pipeline, done flag, retry, rejection jump, pipelineService, inner tasks,
runNestedPipeline, outerRejection, pendingRejections, skip, silent failure

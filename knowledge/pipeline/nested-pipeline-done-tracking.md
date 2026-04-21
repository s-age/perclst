# Nested Pipeline `done` Tracking Behavior

**Type:** Discovery

## Context

Pipelines can contain nested `type: 'pipeline'` tasks. Understanding how `done`
flags propagate through nested runs matters when a nested pipeline is
interrupted mid-way and restarted.

## What happened / What is true

- Each inner task of a nested pipeline gets its own `done` flag through the
  recursive `this.run()` call, which inherits the same `options` object
  (including `onTaskDone`).
- The **outer** `NestedPipelineTask` itself is marked done only after all its
  inner tasks have finished — i.e., when the outer `run()` loop calls
  `onTaskDone` for the nested task's index.
- On a re-run after partial completion: the outer nested task is **not** done,
  so `PipelineService` re-enters it, but already-done inner tasks are skipped
  individually.

## Do

- Expect partial-completion recovery to work at the inner-task level for nested
  pipelines
- Trust that the `onTaskDone` callback is correctly threaded through recursive
  `run()` calls via `options`

## Don't

- Assume the outer nested task is marked done until every inner task is done
- Override `options` when calling `this.run()` recursively unless intentional

---

**Keywords:** pipeline, nested pipeline, done, recursive run, partial completion, onTaskDone, resume

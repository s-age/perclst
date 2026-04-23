# Ink: Child Pipeline Tasks Expand Lazily at Runtime

**Type:** Discovery

## Context

In the TUI Workflow panel, inline `pipeline` tasks have their subtasks
pre-initialized by `initTasks()` at startup. Child pipeline tasks (`type: 'child'`),
which reference external files loaded via `loadChildPipeline`, cannot be
pre-initialized the same way — their subtask count is unknown without reading
those files upfront.

## What happened / What is true

Child pipeline tasks are expanded in the Workflow panel **only when they start
running**, not at panel initialization:

- At `initTasks()` time, child tasks are given no `children` array.
- When a `task_start { taskType: 'child' }` event fires, `children: []` is set
  on the parent node.
- Subsequent subtask `task_start` events insert entries via `upsertAtPath`.

This avoids passing `loadChildPipeline` into `initTasks()` and eagerly reading
every referenced file — which would be complex and slow for deep trees.

### `updateAtPath` vs `upsertAtPath`

Two path helpers handle the two cases:

| Helper | When the slot exists | When the slot is missing |
|---|---|---|
| `updateAtPath` | Updates in place | Silent no-op |
| `upsertAtPath` | Updates in place | Creates via `creator()` callback |

- **Inline `pipeline` tasks**: subtasks are pre-initialized → `updateAtPath` works.
- **`child` tasks**: subtasks don't exist yet → must use `upsertAtPath`.

Because `upsertAtPath` falls back to `updateAtPath`'s behavior when the slot
already exists, it is safe to use on both types; `updateAtPath` is only safe
on inline pipeline subtasks.

## Do

- Use `upsertAtPath` when inserting subtask state for `child` pipeline tasks.
- Set `children: []` on the parent node when the `task_start { taskType: 'child' }`
  event fires, before processing any subtask events.
- Keep lazy expansion logic isolated to the event handler that processes
  `task_start`, not in `initTasks()`.

## Don't

- Don't use `updateAtPath` for child pipeline subtasks — the slot doesn't exist
  yet and the update silently does nothing, leaving task state permanently stale.
- Don't pre-load all child pipeline files in `initTasks()` to build the initial
  tree; it couples initialization to I/O and breaks for deep trees.
- Don't assume inline `pipeline` and `child` task paths are interchangeable —
  they differ in whether `children` is pre-initialized.

---

**Keywords:** ink, TUI, pipeline, child pipeline, lazy expansion, upsertAtPath, updateAtPath, task_start, initTasks, subtask, workflow panel

# markTaskDone: taskPath and pipeline Have Different Reference Points

**Type:** Problem

## Context

In `PipelineService.run()`, recursive execution of child/nested pipelines passes two
arguments that each have a distinct reference frame. Mixing them to navigate tasks
causes a TypeError.

## What happened

The old `markTaskDone` implementation navigated `pipeline.tasks` using `taskPath`
indices. However:

- `pipeline` — the **leaf** pipeline currently being executed (child/nested)
- `taskPath` — the absolute index path from the root (e.g. `[2, 0]`) for UI/events

`taskPath[0]` is the root-level task index. In a leaf pipeline, `tasks[taskPath[0]]`
may be `undefined`, producing a TypeError at runtime.

## What is true

`pipeline` already points to the leaf; no traversal is needed. The fix is:

```ts
pipeline.tasks[taskIndex].done = true
// taskIndex = the local index within this leaf's tasks array
```

`taskPath` must be used only for event publishing and UI coordinates — never for
navigating `pipeline.tasks`.

| Argument   | Meaning                                                  |
|------------|----------------------------------------------------------|
| `pipeline` | The pipeline the current loop iteration governs (leaf)   |
| `taskPath` | Root-relative coordinate for events and UI display only  |

## Do

- Mutate `pipeline.tasks[taskIndex].done` directly; `pipeline` is already the leaf.
- Use `taskPath` exclusively for event emission and display purposes.

## Don't

- Don't index into `pipeline.tasks` using values from `taskPath` — the indices are
  relative to different pipeline levels.

---

**Keywords:** pipeline, taskPath, markTaskDone, recursive, nested, child, pipeline-service, TypeError

# Ink: Pre-Initialize Task List from Pipeline for Better UX

**Type:** Discovery

## Context

When displaying a running pipeline in an Ink TUI, you can either add task rows
dynamically as each `task_start` event fires, or initialize all rows upfront from
the pipeline definition. The choice affects how the UI feels.

## What happened / What is true

Pre-initializing all tasks as `pending` from `pipeline.tasks` before any events
arrive gives the user an immediate overview of the full workflow. Rows are then
updated in-place as events change their status.

```ts
const [tasks, setTasks] = useState(() =>
  pipeline.tasks.map((t) => ({ ...t, status: 'pending' as const }))
)

// On task_start event:
setTasks((prev) =>
  prev.map((t, i) =>
    i === result.taskIndex ? { ...t, status: 'running' } : t
  )
)
```

- The user sees all tasks — including future ones — from the moment the UI renders.
- Status transitions: `pending` → `running` → `done` / `failed`.
- Using index-based matching (`taskIndex`) is safe because pipeline tasks are
  ordered and stable.

## Do

- Initialize the full task list from the pipeline definition inside `useState` initializer.
- Update individual task status by index when events arrive.
- Keep the status field as a discriminated union (`'pending' | 'running' | 'done' | 'failed'`).

## Don't

- Don't append new rows on `task_start` — it makes the list length unpredictable
  and hides the total scope of work from the user.
- Don't use task name as the match key if task names can be non-unique.

---

**Keywords:** ink, pipeline, task list, useState, pre-initialize, pending, UX, task_start, status

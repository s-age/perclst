# Ink TUI: Clear Stream Buffer at Task Start, Not Task End

**Type:** Problem

## Context

When building a pipeline TUI with Ink that shows a right-side output panel
per task, deciding *when* to call `setStreamLines([])` determines whether the
last frame of each task's output stays visible or disappears prematurely.

## What happened / What is true

Clearing the stream buffer on task completion caused a visible empty-panel
flash. The sequence was:

```
case 'agent': setTasks(done) → setStreamLines([]) → loop ends → setDone(true)
```

Because `setStreamLines([])` and `setDone(true)` are separate state updates,
Ink can render a frame between them where the output panel is empty but the
pipeline is not yet marked done. For the final task this "blank window" was
not a brief flash — it persisted until `setDone(true)` triggered the next render.

Moving the clear to `task_start` fixes this: each task's output remains in
the panel until the *next* task begins, and the last task's output stays
visible until the pipeline's `done` state is set.

```ts
case 'task_start':
  setStreamLines([])   // clear previous task's output when the next task begins
  setTasks(...)
  break
case 'agent':
case 'script':
  setTasks(done)       // do NOT clear here — output stays until next task starts
  break
```

## Do

- Clear the stream buffer on `task_start`, so the previous task's output
  survives until the next task actually begins.
- Keep the last task's output visible until the `done` / completion state
  is set.

## Don't

- Don't call `setStreamLines([])` inside the task-completion branch — it
  creates a blank-panel frame before the UI can transition to its final state.
- Don't assume that two consecutive `setState` calls in the same event loop
  tick will always be batched into a single render; Ink may flush between them.

---

**Keywords:** ink, tui, stream lines, clear, task_start, pipeline, blank panel, setStreamLines, render timing, state batching

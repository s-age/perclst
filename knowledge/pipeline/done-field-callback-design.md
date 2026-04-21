# Pipeline `done` Field Written via Callback, Not by Service

**Type:** Discovery

## Context

When designing `PipelineService`, there is a question of who is responsible for
persisting `done: true` after each task completes. This matters because
`PipelineService` lives in the services layer, which must not perform direct
file I/O.

## What happened / What is true

`PipelineService` does **not** write `done: true` to the pipeline file itself.
Instead it calls `options.onTaskDone(taskPath, taskIndex)` after each task
completes without triggering a retry. The CLI layer (`run.ts`) supplies the
callback, which:

1. Mutates the in-memory pipeline object at `taskIndex` to set `done: true`
2. Immediately serializes it back to the source file via `PipelineFileService.savePipeline`

This keeps `PipelineService` pure with respect to I/O while still enabling
per-task persistence after every completion.

## Do

- Provide the `onTaskDone` callback from the CLI layer (`run.ts`)
- Keep `PipelineService` unaware of file paths or serialization

## Don't

- Add file-write logic directly inside `PipelineService`
- Pass file paths into `PipelineService` to let it persist state itself

---

**Keywords:** pipeline, done, onTaskDone, callback, services layer, persistence, architecture

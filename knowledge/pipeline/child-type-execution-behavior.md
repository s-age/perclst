# Pipeline `type: "child"` — Runtime Behavior: Path Resolution, Env Propagation, Done Tracking

**Type:** Discovery

## Context

When a parent pipeline runs a `type: "child"` task, several runtime behaviors are non-obvious: how relative paths are resolved for deeply nested children, how `--yes` / environment variables propagate, and what the MVP limitation is for `done` tracking inside child tasks.

## What happened / What is true

### `pipelineDir` for relative path resolution

- The `path` field of a `type: "child"` task is resolved relative to `pipelineDir` in `PipelineRunOptions`.
- When `PipelineService.runChildPipeline()` recurses into a child, it updates `pipelineDir` to the child's own directory before recursing further.
- This means arbitrarily nested children each resolve their own relative paths correctly.

```typescript
const absolutePath = resolve(options.pipelineDir ?? process.cwd(), task.path)
const childDir = dirname(absolutePath)
yield* this.run(childPipeline, { ...options, pipelineDir: childDir }, ...)
```

### `--yes` / env var auto-propagation

- `PERCLST_PERMISSION_AUTO_YES` is set in `process.env`.
- Child pipelines run in-process via `yield*` — they share the same Node.js process and therefore the same `process.env`.
- No explicit forwarding of `--yes` is needed; it propagates automatically to all child pipelines.

### `done` tracking (MVP limitation)

- When a child pipeline's individual tasks complete, `done: true` is written only to the **parent** pipeline's task entry (the `type: "child"` step), not to the individual tasks inside the child file.
- Mid-child resume is not supported in the MVP; extend when needed.

## Do

- Ensure `pipelineDir` is set to the directory of the currently executing pipeline file before invoking `PipelineService.run()`.
- When building the initial options in `executeTUIPipeline` and other entry points, include both `loadChildPipeline` and `pipelineDir`.
- Rely on automatic `--yes` propagation — no need to thread it through manually.

## Don't

- Don't assume child task-level `done` flags are persisted to the child JSON file — they are not.
- Don't hardcode absolute paths in `type: "child"` tasks; always use paths relative to the parent pipeline's directory.

---

**Keywords:** pipeline, child, pipelineDir, path resolution, nested child, yield*, env propagation, PERCLST_PERMISSION_AUTO_YES, done tracking, MVP limitation, in-process execution

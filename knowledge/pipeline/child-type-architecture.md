# Pipeline `type: "child"` — Architecture and Callback Design

**Type:** Discovery

## Context

When `type: "child"` was introduced to allow parent pipelines to reference and run child pipeline JSON files, `PipelineService` (services layer) needed to parse child files using Zod (`parsePipeline`). However, the architecture rules forbid services from importing validators. A workaround was needed.

## What happened / What is true

- `scripts/run-pipelines.ts` ran all `pipelines/*.json` alphabetically with no explicit ordering — `type: "child"` was introduced to replace it.
- A parent pipeline JSON can now reference a child pipeline file by path; the child runs in-process via `yield*`.
- `PipelineService` must not import `parsePipeline` directly (services → validators is forbidden).
- The solution: add a `loadChildPipeline` callback to `PipelineRunOptions`; the CLI layer (`run.ts`) binds it at call time.

```typescript
// PipelineRunOptions addition
loadChildPipeline?: (absolutePath: string) => Pipeline
pipelineDir?: string  // directory of the current pipeline file
```

```typescript
// CLI layer (run.ts) — binds validators to the callback
const loadChildPipeline = (absolutePath: string) => {
  const raw = pipelineFileService.loadRawPipeline(absolutePath)
  return parsePipeline(raw)
}
```

- This callback pattern mirrors the existing `onTaskDone` callback — it is the established convention for crossing the services→validators boundary.

## Do

- Always pass both `loadChildPipeline` and `pipelineDir` in options when executing a pipeline that may contain `type: "child"` tasks.
- Bind `loadChildPipeline` in the CLI layer, not in `PipelineService` itself.
- Express multi-pipeline orchestration (formerly `run-pipelines.ts`) as a parent pipeline with `type: "child"` tasks.

## Don't

- Don't import `parsePipeline` or any validator directly inside `PipelineService`.
- Don't use `scripts/run-pipelines.ts` for new pipeline ordering — it is superseded by `type: "child"`.

---

**Keywords:** pipeline, child, type child, loadChildPipeline, run-pipelines, services validators forbidden, callback pattern, PipelineRunOptions, layer rules

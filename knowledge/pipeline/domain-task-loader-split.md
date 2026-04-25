# Pipeline Domain Split: PipelineTaskDomain and PipelineLoaderDomain

**Type:** Discovery

## Context

When orchestration logic (marking tasks done, loading child pipelines) lived inline in CLI
commands or as callbacks on `PipelineRunOptions`, the service layer had no single owner
for those responsibilities. A refactor extracted two dedicated domain objects.

## What happened / What is true

Two new domain modules were introduced under `domains/`:

- **`PipelineTaskDomain`** (`domains/pipelineTask.ts`) — owns `markTaskDone`; previously
  inlined in `cli/commands/run.ts`.
- **`PipelineLoaderDomain`** (`domains/pipelineLoader.ts`) — wraps
  `IPipelineFileRepository.readRawJson` for child pipeline loading; call
  `loaderDomain.loadRaw(absolutePath)` then pass the result to `parsePipeline()`.

`PipelineRunOptions` no longer carries a `loadChildPipeline` callback. The service
resolves child pipelines internally: it calls `loaderDomain.loadRaw()`, then imports
`parsePipeline` from validators (services → validators is an allowed dependency direction).
`pipelineDir` remains in options as the starting directory.

`cli/commands/run.ts` was simplified:
- `markTaskDone()` and `makeChildLoader()` removed (now domain responsibilities).
- `onTaskDone` reduced to an expression-body arrow: `(): void => pipelineFileService.savePipeline(...)`.

## Do

- Place pipeline orchestration logic in the appropriate domain (`PipelineTaskDomain` for
  task lifecycle, `PipelineLoaderDomain` for file loading).
- Import `parsePipeline` from validators inside the service when you need to validate
  a freshly loaded child pipeline.
- Keep `pipelineDir` in `PipelineRunOptions` as the base path for resolution.

## Don't

- Don't pass `loadChildPipeline` as a callback through `PipelineRunOptions` — the service
  owns that responsibility now.
- Don't inline domain logic (task marking, child loading) in CLI command files.

---

**Keywords:** PipelineTaskDomain, PipelineLoaderDomain, markTaskDone, loadChildPipeline, PipelineRunOptions, child pipeline, domain refactor, orchestration

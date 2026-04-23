# Child Pipeline Done: Callback + Post-Collection Pattern

**Type:** Discovery

## Context

When a `child` task completes in `pipelineService.runChildPipeline`, the pipeline file must
be moved to `done/`. Both batch mode and TUI mode must be supported, but TUI mode (React/ink)
cannot accept stdout writes or file I/O while rendering is active.

## What happened / What is true

- `onChildPipelineDone?: (absolutePath: string) => void` is added to `PipelineRunOptions`.
- `runChildPipeline` calls it after the child generator finishes, before yielding `pipeline_end`.
- `runCommand` collects the returned paths into a `completedChildPaths[]` array.
- Paths are processed **after** `executePipeline` / `executeTUIPipeline` returns — never inline.
- In TUI mode the callback fires inside a React `useEffect`; calling `stdout.print` there
  corrupts the ink render, so all side-effects must be deferred until after unmount.
- A new yield event (e.g. `child_done`) was considered and rejected: it would require the CLI
  layer to react to a service-level event whose sole purpose is triggering a file operation —
  a leaky abstraction that blurs service/CLI boundaries.
- `PipelineFileDomain.moveToDone` accepts absolute paths and resolves them internally, so
  child paths from `resolve(baseDir, task.path)` pass through without adaptation.

## Do

- Collect completed child paths in an array during pipeline execution.
- Drain the array and call `PipelineFileDomain.moveToDone` **after** the TUI/batch executor returns.
- Pass absolute paths — `moveToDone` handles resolution internally.

## Don't

- Don't call `stdout.print` or perform file I/O inside any callback that fires during ink rendering.
- Don't add `child_done` yield events to the service layer just to trigger CLI-owned file operations.
- Don't move files inline in the generator — the TUI may still be mounted at that point.

---

**Keywords:** child pipeline, done, callback, onChildPipelineDone, TUI, ink, post-collection, moveToDone, PipelineRunOptions, executePipeline, executeTUIPipeline

# TUI Pipeline Abort: Ctrl+Q and AbortSignal Threading

**Type:** Discovery

## Context

TUI mode previously had no way to abort a running pipeline from inside the UI. Ctrl+C was
registered on the process but never reached the active pipeline. Both Ctrl+C and Ctrl+Q
now properly abort TUI pipelines through a shared `AbortSignal`.

## What happened / What is true

The abort path threads an `AbortController` signal from the CLI entry point all the way
into the running pipeline:

- **`useScrollBuffer.ts`** — accepts `onAbort: () => void`; fires it when
  `key.ctrl && input === 'q'`.
- **`usePipelineRun.ts`** — accepts `signal: AbortSignal`, threads it into
  `pipelineService.run()` options.
- **`types.ts`** — `PipelineRunnerProps` gains `signal` and `onAbort` fields.
- **`cli/commands/run.ts`** — `executeTUIPipeline` receives `abortService` and passes
  `signal` and `onAbort` down to the React component.

Previously `usePipelineRun` had `signal: undefined as never`, which silently dropped any
abort request before it reached the service.

## Do

- Pass `signal` from `PipelineRunnerProps` into `pipelineService.run()` options so the
  running pipeline respects abort requests.
- Use `onAbort` as the callback from UI key handlers (Ctrl+Q) up to the controller that
  holds the `AbortController`.
- Test abort behavior end-to-end from the key handler down to the service.

## Don't

- Don't use `signal: undefined as never` — it compiles silently but drops all abort
  signals before they reach the pipeline.
- Don't register Ctrl+C only at the process level for TUI mode; key events inside Ink
  must be wired through the component prop chain.

---

**Keywords:** TUI, Ctrl+Q, AbortSignal, AbortController, onAbort, usePipelineRun, useScrollBuffer, PipelineRunnerProps, force-quit, executeTUIPipeline

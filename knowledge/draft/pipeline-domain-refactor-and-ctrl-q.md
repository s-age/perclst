# Pipeline Domain Refactor + Ctrl+Q

## What changed

Refactored `pipelineService` orchestration and added Ctrl+Q force-quit to TUI.

### New domains

- `PipelineTaskDomain` (`domains/pipelineTask.ts`) — owns `markTaskDone` (previously inlined in cli)
- `PipelineLoaderDomain` (`domains/pipelineLoader.ts`) — wraps `IPipelineFileRepository.readRawJson` for child pipeline loading

### PipelineRunOptions cleanup

Removed `loadChildPipeline` callback from `PipelineRunOptions`. The service now resolves child pipelines internally:
- `pipelineService` gets `loaderDomain.loadRaw(absolutePath)` then calls `parsePipeline()` (imported from validators — services → validators is allowed)
- `pipelineDir` stays in options as the starting directory

### cli/commands/run.ts

- Removed `markTaskDone()` and `makeChildLoader()` (now domain responsibilities)
- `onTaskDone` simplified to expression-body arrow: `(): void => pipelineFileService.savePipeline(...)` — expression-body (no braces) prevents prettier from expanding to 3 lines

### Ctrl+Q (TUI force-quit)

- `useScrollBuffer.ts` — added `onAbort: () => void` prop; `key.ctrl && input === 'q'` calls it
- `usePipelineRun.ts` — accepts `signal: AbortSignal`, threads it into `pipelineService.run()` options
- `types.ts` — `PipelineRunnerProps` gains `signal` and `onAbort`
- `run.ts` — `executeTUIPipeline` receives `abortService` and passes `signal`/`onAbort` to the component

Previously TUI mode had `signal: undefined as never` — Ctrl+C was registered on process but never reached the running pipeline. Both Ctrl+C and Ctrl+Q now properly abort TUI pipelines.

## Gotcha: parsePipeline validation in tests

`childPipeline.test.ts` mock for `loaderDomain.loadRaw` must return valid pipeline JSON (≥1 task).
`{ tasks: [] }` throws `ValidationError` because `parsePipeline` runs Zod validation.
Use `rawChildPipeline = { tasks: [{ type: 'agent', task: 'child work' }] }`.

## Gotcha: max-lines-per-function (50)

ESLint `max-lines-per-function` counts from `async function` keyword to closing `}` inclusive.
Arrow functions with block bodies (`{ ... }`) get expanded to 3 lines by prettier.
Arrow functions with expression bodies (no braces) stay on 1 line, bypassing the expansion.

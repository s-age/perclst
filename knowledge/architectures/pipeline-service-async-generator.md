# PipelineService.run() Is an Async Generator

**Type:** Discovery

## Context

Applies whenever you call or modify `PipelineService.run()`, write a new pipeline task handler,
or need to understand how results are streamed from a running pipeline.

## What happened / What is true

`PipelineService.run()` is typed as `async *run(): AsyncGenerator<PipelineTaskResult>`.

- Results are `yield`-ed to the caller one at a time, as each task completes
- The caller consumes them with `for await...of`, enabling immediate per-task display
- Nested pipelines are streamed via `yield*` — this makes `runNestedPipelineTask` unnecessary (it was removed)
- If an error occurs mid-run, any results already yielded are still delivered to the caller

### Why generator over callback

A callback approach (`onTaskResult?: (result) => void`) was considered and rejected in favour of
the async generator because:

- `for await...of` reads naturally; callbacks require wiring an extra argument through every layer
- `yield*` propagates nested results automatically; callbacks need explicit pass-through in nested calls
- TypeScript type inference works without additional annotations

## Do

- Iterate results with `for await...of` at the call site
- Use `yield*` when delegating to a nested pipeline inside the generator
- Expect partial results even when a later task throws

## Don't

- Don't collect all results before displaying — the generator is designed for incremental output
- Don't reintroduce a callback parameter as an alternative streaming mechanism

---

**Keywords:** PipelineService, async generator, yield, for-await-of, nested pipeline, yield*, streaming, task result

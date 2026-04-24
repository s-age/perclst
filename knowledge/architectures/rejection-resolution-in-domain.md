# Rejection Resolution Belongs in PipelineDomain, Not PipelineService

**Type:** Discovery

## Context

When implementing rejection handling in the pipeline execution layer, there is a design question about where to place the logic that finds the target task, validates retry counts, and constructs the `RejectedContext`. This applies whenever extending or refactoring `handleAgentRejection` / `handleScriptRejection` in `PipelineService`.

## What happened / What is true

- The service layer (`PipelineService`) owns orchestration: sequencing, state maps, and event emission.
- Finding the rejection target in the pipeline, checking retry limits, and building `RejectedContext` are business rules — they belong in `PipelineDomain`.
- `PipelineDomain.resolveRejection(pipeline, toName, taskIndex, currentCount, maxRetries, feedback)` returns `{ targetIndex, context, newCount }` or throws `PipelineMaxRetriesError`.
- The service's `handleAgentRejection` / `handleScriptRejection` call `resolveRejection` after obtaining feedback, then write the results into `retryCount` and `pendingRejections` maps.
- `src/errors/` can be imported from any layer — there is no restriction. `PipelineMaxRetriesError` can be thrown directly from the domain.

## Do

- Put target lookup, retry count validation, and `RejectedContext` construction in `PipelineDomain`.
- Keep `PipelineService` as a thin orchestrator that calls `resolveRejection` and applies the returned state.
- Import and throw domain-specific errors (e.g. `PipelineMaxRetriesError`) directly from the domain layer.

## Don't

- Don't put business rule logic (target resolution, retry validation) in the service layer.
- Don't let `PipelineService` reach into pipeline data to resolve rejection targets directly.

---

**Keywords:** PipelineDomain, PipelineService, resolveRejection, RejectedContext, PipelineMaxRetriesError, rejection handling, domain service split, retry validation, layer responsibility

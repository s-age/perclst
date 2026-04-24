# Stub External Boundaries, Keep Domain Real in Loop Tests

**Type:** Discovery

## Context

Applies when writing tests for a service (e.g. `PipelineService`) that orchestrates domain logic inside a stateful loop — where callbacks mutate task state, retry counters increment, and rejection resolution logic runs across iterations.

## What happened / What is true

`retryAndRejection.test.ts` mocked every `IPipelineDomain` method individually. As a result, the real rejection resolution logic (`resolveRejection`, `resolveScriptRejection`) never ran alongside `PipelineService.run()`'s loop, and callbacks like `onTaskDone` were no-ops. This masked the done-flag/retry interaction bug entirely.

`retryFlow.test.ts` uses the real `PipelineDomain` with stub dependencies at the external boundaries (`IAgentDomain`, `ISessionDomain`, `IRejectionFeedbackRepository`). The loop, done-flag mutation, pending rejections, and rejection resolution all interact naturally — this caught the done-flag skip bug that per-method mocks could not.

## Do

- Keep the domain real in tests for services that loop over stateful domain operations
- Stub only at external I/O boundaries: agent CLI, session storage, network calls
- Prefer integration-style tests (`retryFlow.test.ts` pattern) for retry/rejection logic

## Don't

- Don't mock every domain method individually when the test exercises a stateful loop
- Don't treat `vi.fn()` no-ops as safe replacements for callbacks that mutate task state

---

**Keywords:** stub, mock, PipelineDomain, PipelineService, retry, rejection, onTaskDone, integration test, stateful loop, test granularity

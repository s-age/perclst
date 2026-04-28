# run Command Integration Tests: Hybrid Stub Strategy

**Type:** Discovery

## Context

The `run` command coordinates three layers: `claudeCodeInfra`, `PipelineFileService`
(git operations), and `PipelineService` (task execution). Pure infra-level stubbing
is insufficient for two justified exceptions.

## Default rule

Stub only `claudeCodeInfra`. Use a real `PipelineService` resolved through DI so the
full execution path is verified.

## Exception 1 — PipelineFileService (git operations)

`PipelineFileService.getDiffStat/getHead/moveToDone/commitMove/cleanTmpDir` all call
`GitInfra`, which fails in a non-git tmpdir. Stub at the service level, matching the
`inspect.integration.test.ts` pattern.

## Exception 2 — PipelineMaxRetriesError (internal domain error only)

`PipelineMaxRetriesError` is thrown internally by rejection-handling logic. It cannot
be triggered through `claudeCodeInfra` without a complex pipeline + rejection fixture.
Stub `PipelineService` at the service level **only for this error**.

`RateLimitError` and other user-facing errors **must** use infra-level stubs — they
flow through `claudeCodeInfra.runClaude()` → `agentDomain` → `pipelineService.run()`.

## Stub shapes

```ts
// RateLimitError: infra-level async generator throw
function makeThrowingStub(err: Error) {
  const stub = buildClaudeCodeStub([])
  ;(stub.runClaude as ReturnType<typeof vi.fn>).mockImplementation(
    async function* (): AsyncGenerator<string> { yield* []; throw err }
  )
  return stub
}

// PipelineMaxRetriesError: service-level only
function makePipelineServiceThrowingStub(err: Error): PipelineService {
  return {
    run: vi.fn(async function* (): AsyncGenerator<PipelineTaskResult> {
      yield* []; throw err
    })
  } as unknown as PipelineService
}
```

## Do

- Always use real `PipelineService` for happy paths and RateLimitError.
- Reserve service-level stubs for git-incompatible infra and unreachable internal errors.

## Don't

- Stub `PipelineService` as a "convenience" — it hides integration bugs between layers.

---

**Keywords:** run command, hybrid stub, PipelineFileService, PipelineMaxRetriesError, RateLimitError, claudeCodeInfra, integration test

# ts-morph Lazy Init: Integration Test Warmup Required

**Type:** Problem

## Context

When `TsAnalyzer` (or any class wrapping ts-morph `Project`) uses lazy initialization, integration tests that use the real class without mocks will hit an unexpected timeout problem. The expensive `new Project()` call moves from `beforeAll` into the first test's own timeout window.

## What happened / What is true

- With eager init, `new Project()` runs inside `beforeAll` where a long timeout can be set.
- With lazy init, `new Project()` is deferred to the first method call — which happens inside the first test.
- If that test has only the default 5000 ms timeout, it fails with a timeout error even though the code is correct.

## Do

- Add a warmup call inside `beforeAll` with a generous timeout (e.g., 30 000 ms) to trigger the lazy init before any test runs.

```ts
beforeAll(() => {
  repo = new TsAnalysisRepository(new TsAnalyzer())
  repo.analyzeFile('src/domains/analyze.ts') // triggers lazy Project init
}, 30000)
```

- Individual tests then only pay the query cost, not the scan cost.

## Don't

- Don't assume `beforeAll` is the place `new Project()` fires — with lazy init it isn't.
- Don't set a generous timeout on individual tests to work around this; fix it at the `beforeAll` level.

---

**Keywords:** ts-morph, lazy init, integration test, beforeAll, timeout, TsAnalyzer, warmup, Project construction

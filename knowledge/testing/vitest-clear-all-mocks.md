# Vitest: Mock Call Counts Accumulate Across Tests

**Type:** Problem

## Context

In Vitest test suites that use `vi.mocked(SomeClass).mockImplementation(...)` inside `beforeEach`, re-registering the implementation does **not** reset the mock's call history. Call counts carry over from previous tests, causing false failures.

## What happened / What is true

- `mockImplementation()` replaces the implementation but leaves `mock.calls`, `mock.instances`, and `mock.results` intact.
- A test that asserts `not.toHaveBeenCalled()` will fail if any earlier test in the suite triggered the same mock.
- This is especially common with lazy-initialized classes: one test exercises the constructor, the next checks it wasn't called and sees a stale non-zero count.

## Do

- Call `vi.clearAllMocks()` at the top of `beforeEach`, before re-registering any implementations.

```ts
beforeEach(() => {
  vi.clearAllMocks()                         // resets calls, instances, results
  mockFoo = vi.fn()
  vi.mocked(Project).mockImplementation(...) // re-set implementation after clear
})
```

- `vi.clearAllMocks()` preserves the mock function itself; the subsequent `mockImplementation` re-establishes behavior.

## Don't

- Don't rely on `mockImplementation` alone to reset call history between tests.
- Don't use `vi.resetAllMocks()` if you need implementations to survive — it also removes them.

---

**Keywords:** vitest, clearAllMocks, mock call count, beforeEach, toHaveBeenCalled, toHaveBeenCalledTimes, accumulated calls, mock reset

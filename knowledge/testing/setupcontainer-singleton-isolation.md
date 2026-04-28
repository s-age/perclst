# setupContainer Singleton Contamination Across Vitest Workers

**Type:** Discovery

## Context

`setupContainer` overwrites the DI container singleton. When Vitest shares a worker
process across multiple test files, one file's `setupContainer` call can bleed into
another file's test run.

## What is true

- Vitest's default configuration uses `isolate: true`, which gives each test file its
  own worker — preventing cross-file DI contamination.
- Configurations that disable isolation (`--singleThread`, `--pool=vmThreads`, or
  explicit `isolate: false`) allow the container singleton to leak between files.
- The result is flaky, order-dependent test failures that are hard to trace.

## Do

- Keep Vitest's default `isolate: true` in place for any test suite that uses
  `setupContainer`.
- Document this constraint in the integration test procedure / plan so future authors
  do not accidentally disable isolation.

## Don't

- Run integration tests with `--singleThread` or other modes that disable per-file isolation.
- Assume that `beforeEach`/`afterEach` cleanup is sufficient — worker-level isolation
  is the only reliable safeguard.

---

**Keywords:** setupContainer, singleton, Vitest, isolate, worker, DI container, contamination

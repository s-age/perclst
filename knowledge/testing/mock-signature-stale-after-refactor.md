# Mock Signatures Silently Stale After Port Refactors

**Type:** Problem

## Context

When a domain or port method signature is changed (e.g., flat parameters grouped into an object), any `vi.fn().mockImplementation(...)` blocks referencing that method must be updated manually. TypeScript does not enforce this because `vi.fn()` without explicit generics accepts any argument shape at the call site.

## What happened / What is true

- `runAgentTask` was refactored from `(_task, taskIndex, taskPath)` to `(_task, taskLocation: { index, taskPath })`.
- A mock in `taskLifecycle.test.ts` retained the old signature.
- TypeScript raised no error — `vi.fn()` accepted the old parameter names silently.
- At runtime the `taskLocation` object was assigned to `taskIndex`, so `taskIndex === 0` was always `false` and the `name` field always resolved to `'rejector'`, causing tests to misbehave without a clear error message.

## Do

- After changing any port or domain method signature, grep for all `mockImplementation` blocks that reference the method:
  ```bash
  grep -rn "runAgentTask\|<method-name>" src/
  ```
- Type `vi.fn()` explicitly when the mock has a known signature to get compile-time safety:
  ```ts
  vi.fn<typeof runAgentTask>()
  ```

## Don't

- Don't assume TypeScript will catch stale mock signatures — it won't without explicit generic typing on `vi.fn()`.
- Don't skip mock audits when refactoring function signatures, even if the build and lint pass cleanly.

---

**Keywords:** vitest, vi.fn, mockImplementation, stale mock, refactor, signature change, silent failure, port, domain, taskLocation

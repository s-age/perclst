# Constructor Injection Removes vi.mock in Repository Tests

**Type:** Discovery

## Context

After refactoring repositories to accept dependencies via constructor injection (instead of importing from module scope), repository tests no longer need `vi.mock(...)` for the infrastructure module.

## Discovery

Pre-refactor repository tests used `vi.mock('@src/infrastructures/fs')` to replace the globally-imported `FsInfra`. Post-refactor, the repository receives its `FsInfra` (or a `Pick` of it) through the constructor, so tests build a plain object literal and pass it directly:

```typescript
// Before (module mock required)
vi.mock('@src/infrastructures/fs');

// After (constructor injection — no vi.mock needed)
const mockFs: SessionFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
};
const repo = new SessionRepository(mockFs);
```

This eliminates hoisting-order sensitivity and makes each test's dependency surface explicit.

## Residual vi.mock usage

Keep `vi.mock(...)` in repository tests only for modules still imported at module scope — e.g. pure-function utilities like `formatInputSummary` or parser modules that are not injected.

## Do

- Build plain object literals with `vi.fn()` stubs and pass them to the constructor
- Use the repository's local `Pick` type for the stub object
- Remove `vi.mock('@src/infrastructures/fs')` once the constructor injection refactor is complete

## Don't

- Keep `vi.mock(...)` for infrastructure modules that are now injected
- Cast stubs to the full `FsInfra` instead of the narrower `Pick` type used by the constructor

---

**Keywords:** DI, constructor injection, vi.mock, repository tests, FsInfra, mock hoisting, stub object

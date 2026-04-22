# Vitest Mocking Gotchas

**Type:** Problem

## Context

When writing unit tests with vitest, mocking modules requires careful consideration of how the mocked code is used. Incorrect mocking strategies break runtime checks and cause tests to silently fail to catch real issues.

## What happened / What is true

- **`vi.mock()` replaces the entire module** — importing a mocked module gives you the mock, not the original
- **`instanceof` checks fail when the class is mocked** — catch blocks checking `error instanceof MyError` will never match if `MyError` was mocked, because the thrown error is a different class object
- **Module-level `vi.mock()` callbacks cannot be async** — `await` is not allowed in the callback function
- **`vi.mocked()` provides proper TypeScript typing** — superior to casting with `as any`

Example failure pattern:
```typescript
vi.mock('@src/errors/ValidationError')  // ❌ Replaces class

// In tested code:
catch (error) {
  if (error instanceof ValidationError) { ... }  // Never true!
}
```

## Do

- Let class/error modules be **real** if they're only used for `instanceof` checks
- Mock only side-effect modules: `child_process`, `fs`, DI containers, external services
- Use `vi.mocked(fn)` when setting up expectations on mocked functions (provides typing)
- Check the caught error type in your test assertions to verify the mock is working

## Don't

- Mock error or exception classes that are caught and type-checked with `instanceof`
- Cast mocks to `any` — use `vi.mocked()` for proper typing
- Use `async` callbacks in `vi.mock()` calls — mock all dependencies statically or don't mock
- Assume a mocked module will have the same runtime behavior as the real one

---

**Keywords:** vitest, mocking, instanceof, error-handling, type-safety

# Testing Private Methods via Public API Instead of `as any`

**Type:** Problem

## Context

Applies whenever writing unit tests for a class with private methods in TypeScript. Relevant to any test file that needs to exercise behaviour implemented in private methods (e.g. `PipelineDomain.runWithLimit`, `PipelineDomain.resumeNamedSession`).

## What happened / What is true

Tests in `execution.test.ts` accessed `runWithLimit` and `resumeNamedSession` — private methods on `PipelineDomain` — via `(pipelineDomain as any).method(...)`. When either method was renamed or its signature changed, the tests failed silently at runtime rather than being caught at compile time, defeating TypeScript's safety guarantees.

The fix:
- `runWithLimit` graceful-termination tests were moved into the `runAgentTask` describe block (the public API that calls it).
- `resumeNamedSession` tests were deleted entirely — they were duplicates of existing `runAgentTask` tests.

## Do

- Test private method behaviour through the public API that exercises it.
- Delete private-method tests that are already covered by public-method tests.
- Export a function only if it represents a genuinely reusable, independently testable unit that would be exported even without the test requirement.

## Don't

- Use `(instance as any).privateMethod()` in tests — type errors are silenced and renames go undetected.
- Extract private methods as exported functions solely to make them testable — this pollutes the module interface for a test concern.

---

**Keywords:** private method, as any, testing, TypeScript, PipelineDomain, runWithLimit, resumeNamedSession, public API, unit test, type safety

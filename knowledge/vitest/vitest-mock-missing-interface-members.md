# Vitest Does Not Catch Missing Interface Members in Mocks

**Type:** Problem

## Context

Applies whenever a TypeScript interface gains a new method and existing test mock objects are not
updated. Because Vitest transpiles via esbuild (fast type-stripping), the type system is bypassed at
test runtime, so incomplete mocks pass silently.

## What happened / What is true

- `sessionService.test.ts` had a `makeMockDomain(): ISessionDomain` helper that omitted three
  required methods: `setLabels`, `addLabels`, and `save`.
- Vitest ran all tests without error. Coverage showed uncovered lines in the service under test
  rather than a missing-member compile error.
- The TypeScript compiler (`tsc --noEmit`) would catch this, but Vitest's transpiler does not run
  `tsc` — it only strips types.
- If `as unknown as IFoo` or a loose return-type annotation is used, `tsc` may also miss it.

## Do

- Include **all** required interface methods in every mock object, even if unused in a specific test.
  Use `vi.fn()` without type parameters — its inferred `(...args: any[]) => any` is structurally
  compatible with any function signature.
- Run `ts_checker` (lint → build → tests) after adding a new interface method; the `tsc` build step
  will catch missing mock members when the return type is explicitly annotated.
- Prefer `satisfies IFoo` or an explicit `: IFoo` annotation on mock objects so `tsc` enforces
  completeness.

## Don't

- Don't rely on test passage alone to confirm that a new interface method is exercised.
- Don't use `as unknown as IFoo` on mock objects — it bypasses structural checking entirely.
- Don't skip the build step when extending an interface; test-only runs will not reveal the gap.

---

**Keywords:** vitest, typescript, mock, interface, missing method, esbuild, type checking, tsc, coverage, ISessionDomain

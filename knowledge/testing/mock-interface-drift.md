# Test Mock / Interface Drift Goes Silently Undetected

**Type:** Problem

## Context

When a port interface (e.g. `ISessionDomain`, `ISessionRepository`) gains new methods,
existing test mock objects typed against that interface do **not** automatically fail to
compile — even though structurally they are now incomplete. This matters whenever you expand
a domain port and want to be sure every test double is up to date.

## What happened / What is true

- `mockSessionDomain` in `analyzeDomain.test.ts` was missing `setLabels`, `addLabels`,
  `resolveId`, `createRewind`, and `sweep` after those methods were added to `ISessionDomain`.
- `mockSessionRepo` in `sessionDomain.test.ts` was missing `findByName` after it was added
  to `ISessionRepository`.
- Both files built cleanly and all tests passed — no error surfaced automatically.
- Root cause: `vi.fn()` mocks satisfy TypeScript structurally only for the properties present
  on the object literal. Casting patterns (`as never`, `as any`, or how Vitest types its mocks)
  suppress the missing-property error at the call site, so TS never complains about the gap.

## Do

- After adding a method to any port interface, run `ts_checker` to catch compile-time regressions.
- Also grep `__tests__/` for every mock of that interface and manually verify each mock includes
  the new method — TypeScript will not report the gap on its own.
- Add the missing `vi.fn()` stubs to every incomplete mock even if the test doesn't call the
  new method, so future additions are caught sooner.

## Don't

- Don't assume a green build means all mocks are up to date after an interface change.
- Don't rely on test failures to surface mock drift — if the new method isn't called in an
  existing test, the test will pass regardless.

---

**Keywords:** mock drift, interface drift, port interface, ISessionDomain, ISessionRepository,
vi.fn, vitest, TypeScript structural typing, as never, as any, silent compile error, missing method

# Zod v4: ZodError.errors Renamed to .issues

**Type:** External

## Context

Applies whenever code accesses validation error details from a `ZodError` object with Zod v4
(`^4.x`). Any code written against Zod v3 that reads `error.errors` will silently receive
`undefined` and crash at the first downstream call (e.g., `.map()`).

## What happened / What is true

- In Zod v4, `ZodError.errors` was removed; the canonical property is `ZodError.issues`.
- `error.errors` returns `undefined` in v4 — no deprecation warning, no runtime type error from
  Zod itself, just `undefined`.
- Code that matches `instanceof z.ZodError` and then calls `error.errors.map(...)` throws
  `TypeError: Cannot read properties of undefined (reading 'map')` instead of the expected
  `ValidationError`, because the guard passes but the property access fails.
- The bug is invisible without tests that exercise validation-failure paths.

## Do

- Use `error.issues` (not `error.issues` and not `error.errors`) in all Zod v4 code.
- Write unit tests for validation-failure branches; they are the earliest signal of this class of breakage.
- After any Zod major-version bump, grep for `.errors` on `ZodError` instances and replace with `.issues`.

## Don't

- Don't rely on `error.errors` in Zod v4 — it is `undefined`, not an empty array.
- Don't assume `instanceof z.ZodError` alone is sufficient to guarantee property shape across
  major versions.

---

**Keywords:** zod, zod v4, ZodError, errors, issues, validation, TypeError, safeParse, schema

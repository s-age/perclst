# Symbol() vs Symbol.for() in DI Token Mock Factories

**Type:** Problem

## Context

When writing Vitest tests that mock `TOKENS` (DI identifier constants) with a custom factory,
it is tempting to create symbols inline with `Symbol('Name')`. This silently produces tokens
that are never equal to the real production tokens, yet the tests still pass.

## What happened / What is true

`list.test.ts` mocked `TOKENS` with a custom factory:

```ts
vi.mock('@src/core/di/identifiers', () => ({
  TOKENS: { SessionService: Symbol('SessionService') }
}))
```

`Symbol('SessionService')` creates a **new unique symbol** every time — it is never equal to
the real `Symbol.for('SessionService')` used in production. However, because both the
code-under-test and the assertions import from the same mocked module, both sides receive the
same mock symbol, so `toHaveBeenCalledWith(TOKENS.SessionService)` passes even though the
mock token is a completely different identity from the real one.

This compounds the general constants-mocking antipattern:
- `Symbol()` ≠ `Symbol.for()` — a typo or rename in the real identifiers file goes undetected
- The test silently verifies nothing meaningful about which token is actually resolved

## Do

- Use the real `TOKENS` import without mocking — `TOKENS` is a pure constant with no side effects
- If a symbol constant must be replicated in a test, use `Symbol.for('Name')` to match production

```ts
// ✅ No mock — TOKENS is a pure constant; Symbol.for() is globally registered
import { TOKENS } from '@src/core/di/identifiers'
vi.mock('@src/core/di/container')

expect(container.resolve).toHaveBeenCalledWith(TOKENS.SessionService)
// Now checks against the actual Symbol.for('SessionService')
```

## Don't

- Replace `Symbol.for('X')` with `Symbol('X')` in mock factories — they are never equal
- Assume a custom mock factory is "safer" than auto-mock; both hide identifier mismatches
- Mock `TOKENS` or any pure constant at all (see `vitest-constant-mocking.md`)

---

**Keywords:** vitest, mocking, Symbol, Symbol.for, DI tokens, constants, identifiers, mock factory

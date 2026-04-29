# Vitest Mock Setup Helper Pattern

**Type:** Discovery

## Context

When writing vitest tests with multiple similar test cases (happy path + error variants), the same mock initialization gets repeated across many test blocks. This violates DRY and creates fragility—a single change to the mock structure requires updating 10+ tests.

## What happened / What is true

- Repeating identical `vi.mocked().mockReturnValue()` chains in every test leads to maintenance burden and copy-paste errors
- Module-level `vi.mock()` applies globally; helpers should not call `vi.mock()` again
- Parameterized setup helpers eliminate duplication while supporting test-specific overrides
- Pattern: `setupSuccessful*(overrides?)` for happy path, `setup*Failure(error)` for error scenarios
- Tests using helpers become concise—setup calls are one line, assertions remain explicit

## Do

- Extract common mock initialization into parameterized helper functions (`setupSuccessfulMocks()`, `setupParseFailure()`, etc.)
- Use optional override parameters to support test-specific variations without creating new helpers
- Keep `beforeEach(() => vi.clearAllMocks())` to reset mocks between tests
- For multi-step failures, setup only the failing step; earlier steps should succeed (partial setup in error helpers)
- Name helpers semantically: `setupSuccessful*` for happy path, `setup*Failure` for error paths

## Don't

- Repeat mock setup code across multiple test blocks
- Call `vi.mock()` inside helper functions (already applied globally)
- Create a new helper for every minor parameter variation—use `overrides?: { field?: value }` instead
- Mock all steps in error helpers when only one step fails—partial setup is clearer

---

**Keywords:** vitest, mocks, setup, helpers, duplication, DRY, test maintenance, vi.mocked

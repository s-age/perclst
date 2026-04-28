# ts_test_strategist Should Not Be Used for Integration Tests

**Type:** Discovery

## Context

When writing integration tests for CLI commands, it is tempting to call `ts_test_strategist`
to derive a mocking strategy. This is counterproductive for integration tests.

## What is true

- `ts_test_strategist` derives mock suggestions from cyclomatic complexity of the source file.
- Its `suggested_mocks` list typically targets service-layer classes (`SessionService`, etc.)
  with `vi.fn()` replacements — which breaks the integration test's purpose of exercising
  the full DI stack.
- Its `expected_test_file_path` resolves to `__tests__/<cmd>.test.ts`, not
  `integration/<cmd>.integration.test.ts`.

The tool is designed for unit tests. Integration tests have a fixed, known mock boundary
(infra layer only), so there is nothing to discover.

## Do

- Derive the mock strategy from the `plans/` document that specifies what to test.
- Stub only `claudeCodeInfra` (or `repos` / `services` when justified by infra incompatibility).
- Check the procedure (`procedures/test-integration/implement.md`) for the authoritative
  approach.

## Don't

- Call `ts_test_strategist` when writing or planning integration tests.
- Let its `suggested_mocks` guide you — they will produce unit-test-style stubs that
  destroy integration coverage.

---

**Keywords:** ts_test_strategist, integration test, mock strategy, DI stack, suggested_mocks

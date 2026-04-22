# Testing Private Functions Indirectly

**Type:** Discovery

## Context

When `ts_test_strategist` identifies untested functions, some are internal/private and not
exported from their module. Attempting to test them directly via import fails, requiring an
indirect testing strategy through the public API.

## What happened / What is true

- Private functions cannot be imported directly — TypeScript rejects them at the import site
- `dynamic import()` also does not expose private functions
- The correct approach is to test them **indirectly through exported functions that call them**
- Comprehensive tests of exported functions naturally exercise all code paths in private helpers
- This pattern avoids exposing internal implementation details in the public API

**Example:** In `analyze.ts`, private functions `formatToolInput`, `printJsonOutput`,
`printTextSummary`, and `printDetailedTurns` are tested by calling `analyzeCommand` with
different option combinations and asserting on what gets printed to stdout.

> **Complexity threshold**: For private functions with cyclomatic complexity > 5, indirect
> testing often misses edge cases. In those cases, export the helper (with `@internal` if
> test-only) and write direct unit tests. See `private-helper-testability.md`.

## Do

- Run `ts_test_strategist` to identify untested functions; check if each is exported
- For private functions: write thorough tests of the **exported functions that call them**
- Mock stdout and service calls to capture side effects; parse output to verify internal behavior
- Ensure indirect tests cover all branches of the private function (review source as needed)
- Only export a private function for testing if it has complexity > 5; use `@internal` JSDoc

## Don't

- Don't try to directly import or use `dynamic import()` on private functions
- Don't create test-only exports without `@internal` markers
- Don't skip testing private functions — test them indirectly instead
- Don't assume indirect testing is sufficient for complex helpers (complexity > 5)

---

**Keywords:** private functions, indirect testing, test coverage, untested functions, public API,
encapsulation, ts_test_strategist, @internal

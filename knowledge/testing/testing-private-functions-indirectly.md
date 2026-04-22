# Testing Private Functions Indirectly

**Type:** Discovery

## Context

When test strategist tools (like `ts_test_strategist`) identify untested functions, some are internal/private and not exported from their module. Attempting to test them directly via imports fails, creating confusion about whether they actually need tests.

## What happened / What is true

- Private functions (e.g., `formatToolResult`, `makeDisplay` in `display.ts`) are not available via direct `import` statements
- Dynamic `import()` also does not expose private functions
- The correct approach is to test them **indirectly through exported functions that call them**
- Comprehensive tests of exported functions naturally exercise all code paths in private helpers
- This pattern avoids exposing internal implementation details in the public API

## Do

- Run `ts_test_strategist` to identify untested functions by complexity and branch coverage
- Check if each function is exported before deciding on a testing strategy
- For private functions: write thorough tests of the **exported functions that call them**
- Ensure indirect tests cover all branches of the private function (review source if needed)
- Only export private functions for testing if the indirect testing burden becomes unreasonable

## Don't

- Don't try to directly import or test private functions
- Don't create test-only exports without using JSDoc `@internal` markers
- Don't skip testing private functions — test them indirectly instead
- Don't assume "it's private so we don't test it" — test coverage matters regardless of visibility

---

**Keywords:** private functions, indirect testing, test coverage, untested functions, integration testing

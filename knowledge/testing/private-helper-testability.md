# Private Helper Functions: Direct vs. Indirect Testing

**Type:** Problem

## Context

When a module contains private helper functions with significant complexity (cyclomatic complexity > 5), deciding how to test them affects maintainability and refactoring safety. Indirect testing through public API entry points leaves edge cases vulnerable.

## What happened / What is true

- **Indirect testing verifies integration**: Private functions work correctly *in context* through the public API that calls them.
- **Indirect testing misses isolation**: Edge cases, error paths, and boundary conditions may never be exercised through the public interface.
- **High complexity demands direct tests**: Functions with complexity > 5 need dedicated test cases per branch; indirect tests rarely cover all branches.
- **Refactoring risk increases**: Without direct tests, changes to a private function are unsafe, even if public API tests still pass.

Example: `searchDir()` in `testFileDiscovery.ts` has complexity 8 (requires 7 test cases) but zero direct tests. It is only tested indirectly via `findTestFile`. This works until someone refactors `searchDir` and breaks an edge case not triggered by existing `findTestFile` scenarios.

## Do

- Export private helpers (or re-export in test files) if complexity > 5
- Write direct unit tests for each branch of private helper functions
- Use test strategist to identify untested private functions and required test case counts
- Treat private functions with high complexity the same as public functions for testing

## Don't

- Assume indirect testing provides adequate safety for complex helpers
- Leave functions with complexity > 5 untested (even if indirectly exercised)
- Refactor a complex private function without direct tests as a safety net

---

**Keywords:** private functions, cyclomatic complexity, unit tests, helper functions, test coverage

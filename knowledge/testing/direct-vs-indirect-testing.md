# Direct vs Indirect Testing for Private Functions

**Type:** Discovery

## Context

When unit testing modules with private helper functions (not exported), teams often test them indirectly through the public API that calls them. The `ts_test_strategist` tool flags private functions with cyclomatic complexity ≥2 as "missing direct tests" even when thoroughly tested indirectly. This creates a decision point: should you export for direct testing, or accept indirect coverage?

## What is true

Private helper functions with complexity ≥2 containing critical logic should have direct unit tests when:
- The function has multiple branches or edge cases that would be hard to trace through integration test failures
- Bugs in the helper would be difficult to isolate without direct regression tests
- The function handles domain-critical logic (parsing, validation, transformation)
- Future refactors of the public API might inadvertently skip testing the private helper

Indirect testing alone leaves these functions vulnerable to regressions that only manifest when called through specific public API paths, making debugging harder.

Example from `knowledgeSearch.ts`: `parseQuery()` and `extractKeywords()` were complexity 2, handled regex logic and string parsing critical to search, and were tested only indirectly. Direct tests were needed.

## Do

- Add direct unit tests for private functions with complexity ≥2 that handle parsing, validation, or transformation logic
- Export private helpers explicitly for testing (`export { parseQuery, extractKeywords }`) rather than hiding them
- Document why a helper is exported if it's not part of the intended public API
- Test both happy paths and edge cases in direct tests (empty input, whitespace, invalid format)
- Use the `ts_test_strategist` minimum suggested test case count as a baseline

## Don't

- Accept the strategist warning as "we just test indirectly" without evaluating the function's importance
- Export helpers just to suppress warnings without actually writing direct tests
- Ignore functions with low complexity—complexity 1 functions usually need only indirect testing
- Leave complex parsing/validation logic untested at the unit level

---

**Keywords:** vitest, unit-testing, private-functions, helper-functions, testing-strategy, complexity, direct-testing, indirect-testing

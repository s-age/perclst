# Test Subdirectory Structure for Domains

**Type:** Discovery

## Context

When writing unit tests for domain files with both pure helper functions and a main class, keeping all tests in a single file can exceed the 500-line lint limit. A subdirectory structure keeps tests organized while respecting file size constraints.

## What happened / What is true

For domain files with mixed helper functions and a main class, split tests into a subdirectory:

- `__tests__/domain-name/helpers.test.ts` — tests for pure functions
- `__tests__/domain-name/domain.test.ts` — tests for the main class and its methods

This pattern keeps individual test files well under 500 lines while maintaining clear semantic separation.

Example from `testStrategy`:
- `src/domains/__tests__/testStrategy/helpers.test.ts` — 380 lines, 30 test cases covering 7 helper functions
- `src/domains/__tests__/testStrategy/domain.test.ts` — 176 lines, 10 test cases covering TestStrategyDomain class

## Do

- Use subdirectories when a single test file would exceed ~400 lines
- Name files by what they test: `helpers.test.ts`, `domain.test.ts`, `ports.test.ts`
- Keep semantic grouping: group related test subjects in the same file

## Don't

- Create single large test files without considering the 500-line limit
- Over-split into too many small files (aim for 2–3 files per domain, not 10)

---

**Keywords:** test organization, subdirectories, file structure, 500-line limit, domain tests

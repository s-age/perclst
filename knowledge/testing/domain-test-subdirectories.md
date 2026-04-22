# Domain Test Subdirectories for Large Suites

**Type:** Discovery

## Context

When writing comprehensive unit tests for domain classes with many methods (10+), organizing tests by functionality—not individual test files per method—keeps related logic together while respecting the 500-line max-lines rule. This applies when a domain class handles multiple cohesive areas like rejection, execution, and limits.

## What is true

- Group related methods into subdirectory structure: `__tests__/domain-name/utils.test.ts`, `rejection.test.ts`, `execution.test.ts`, `limits.test.ts`
- Organize by **functional area**, not by complexity or alphabetically
- Each test file should be self-contained with its own `vi.mock()` declarations (file-scoped)
- Test case order within describe blocks: happy path → variations → complex branches → error paths

## Do

- Organize tests by functional grouping (e.g., rejection handling, token limits, agent execution)
- Include file-scoped `vi.mock()` in each test file that needs them
- Keep each test file under 500 lines
- Test related methods together when they share mocks or dependencies
- Order tests to show the behavioral contract clearly

## Don't

- Organize alphabetically by method name (reduces logical cohesion)
- Share mock declarations across test files
- Mix unrelated functional areas in one test file
- Create one test file per method for large domains (leads to directory bloat)

---

**Keywords:** test organization, domain testing, subdirectory, large test suites, functional grouping, max-lines limit

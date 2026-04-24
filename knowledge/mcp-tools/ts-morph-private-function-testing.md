# Testing Private TypeScript Parser Functions

**Type:** Discovery

## Context

When testing TypeScript parsing modules that use ts-morph, many helper functions are internal and not exported (e.g., `countStructure`, `collectImportedNames`). Direct unit testing of these functions is not possible, but they must still be validated.

## What is true

- Internal parser functions can be tested indirectly through their public API wrapper
- `ts-morph` provides `Project` with `useInMemoryFileSystem: true` for isolated testing without disk I/O
- Assertions on the returned data structure (e.g., `RawFunctionInfo` array) verify the behavior of all internal functions at once

## Do

- Create real TypeScript code snippets using ts-morph's in-memory filesystem
- Pass `SourceFile` objects to public APIs and assert on returned structured data
- Test multiple scenarios (branches, loops, operators, catch clauses) in separate cases to isolate each concern
- Split test files by responsibility when they exceed 300 lines (one for fs-dependent functions, one for ts-morph functions)

## Don't

- Try to mock ts-morph's `Node` and `SyntaxKind` — the real library is lighter and more reliable
- Write tests that attempt to test internal functions directly via import manipulation
- Combine fs-dependent and ts-morph tests in the same file beyond ~200 lines to avoid hitting max-lines linter rule

---

**Keywords:** ts-morph, private-function-testing, indirect-testing, integration-testing, in-memory-filesystem

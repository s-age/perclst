# Indirect Testing of Private Functions

**Type:** Discovery

## Context

When writing unit tests, the test strategist may identify internal helper functions (without `export` keyword) that need coverage. These functions cannot be imported directly into test files, requiring an alternative testing strategy that still validates their behavior.

## What happened / What is true

Private helper functions should be tested indirectly through their exported public API. The private functions' behavior is validated by:
- Calling the public entry point with different input combinations
- Mocking side effects (e.g., `stdout.print`, service calls)
- Extracting and validating the outputs (JSON parsing, string content)
- Verifying the internal functions were invoked correctly

**Example:** In `analyze.ts`, private functions `formatToolInput`, `printJsonOutput`, `printTextSummary`, and `printDetailedTurns` are tested by calling `analyzeCommand` with different option combinations and checking what gets printed to stdout.

## Do

- Test the exported public function with all input variants
- Mock stdout and service calls to capture side effects
- Parse and validate the output to prove internal functions worked correctly
- Refactor internal function names or structure without breaking tests (they're implementation details)
- Keep tests focused on the public contract, not internals

## Don't

- Export helper functions solely to make them testable
- Try to import non-exported functions (TypeScript will reject them)
- Test private functions in isolation; test their behavior through public API
- Assume internal functions need separate unit tests

---

**Keywords:** unit testing, private functions, export, indirect testing, public API, encapsulation

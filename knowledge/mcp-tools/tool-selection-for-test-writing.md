# MCP Tool Selection for Unit Test Writing

**Type:** Discovery

## Context

When writing unit tests for a TypeScript file, four MCP analysis tools are available:
`ts_analyze`, `ts_checker`, `ts_get_types`, and `ts_get_references`. Their value varies
significantly by task, and choosing the wrong one wastes a tool call.

## What happened / What is true

Evaluated all four tools while writing tests for `src/validators/cli/runPipeline.ts`:

- **`ts_analyze`** — high value. Returns exports, imports, and symbol list in one call.
  Immediately shows what needs testing and which dependencies need mocking, without
  reading the file line by line. Best first step before writing tests.

- **`ts_checker`** — high value, but scoped to verification. The single-command
  lint + build + test loop is the correct final step after writing tests, not a
  discovery tool.

- **`ts_get_types`** — moderate value. Useful when you need an exact function signature
  that `ts_analyze` didn't surface fully. Most valuable when the type lives in a
  separate file from the implementation.

- **`ts_get_references`** — low value for test writing, high value for refactoring.
  Shows call sites across the codebase, but callers are irrelevant to what cases
  need covering in a test file.

The recommended sequence for test writing is:
`ts_test_strategist` → `ts_analyze` → Read target file → write tests → `ts_checker`

## Do

- Use `ts_analyze` as the first exploratory call when starting a test file
- Reserve `ts_get_references` for refactoring / blast-radius assessment
- Use `ts_get_types` only when a signature is ambiguous after `ts_analyze`
- Always end with `ts_checker` to verify lint + build + tests pass

## Don't

- Don't call `ts_get_references` at the start of a pure test-writing task — the
  caller context is irrelevant and the call is wasted
- Don't skip `ts_analyze` and go straight to reading the file; the symbol list
  is faster than parsing the file manually

---

**Keywords:** ts_analyze, ts_get_references, ts_get_types, ts_checker, test writing, mcp tools, tool selection, unit tests

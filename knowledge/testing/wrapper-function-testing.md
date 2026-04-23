# Testing Simple Validation Wrapper Functions

**Type:** Discovery

## Context

Simple wrapper functions (1-2 lines) that pass input directly to a validation dependency (like `safeParse`) are common in the `src/validators/` layer. Without clear patterns, test suites tend to inflate with redundant tests that duplicate code paths.

## What happened / What is true

A 1-line wrapper like `parseListSessions(raw) → safeParse(listSchema, raw)` has only 3 observable code paths:
1. Success: safeParse returns result — return it unchanged
2. Error: safeParse throws — propagate the error
3. Input passthrough: accept any input type — pass it unchanged to safeParse

Common over-testing patterns:
- Testing field combinations (e.g., `{ label: 'x', like: 'y' }` vs `{ label: 'x' }` vs `{ like: 'y' }`)
- Testing different VALUES in the same input type (e.g., empty strings, long strings, special characters as separate tests)
- Duplicating the same assertion across multiple test blocks

These all test the same code path and are schema validation concerns, not wrapper concerns. This can inflate 1 wrapper function to 17+ tests.

The key distinction is **input TYPE** (null, undefined, number, array, object) vs **input VALUE** ("abc", special chars, unicode). Types must be tested; values are variants of the same type.

## Do

- Write 1 happy-path test that verifies the function returns safeParse's result
- Consolidate input type testing into 1 `it.each` block with 5-8 input type variants (null, undefined, number, array, plain object, extra fields)
- Use `it.each` when ≥3 cases share the same assertion shape
- Name tests to describe observable behavior: "accepts X input unchanged" (behavior-focused)
- Write error handling test that verifies exceptions from safeParse are propagated
- Include 2-3 edge case VALUE tests (long strings, special characters, unicode) only for robustness documentation — group them after error cases

## Don't

- Test field combinations in wrapper function tests — that's the schema's responsibility
- Create separate tests for different values in the same input type (e.g., "handles long strings" and "handles special characters" as individual it() blocks)
- Write implementation-focused test names like "passes raw input to safeParse as second argument"
- Duplicate the same assertion structure across multiple tests — consolidate with it.each

---

**Keywords:** wrapper functions, validation, test-consolidation, it.each, over-testing, code-paths

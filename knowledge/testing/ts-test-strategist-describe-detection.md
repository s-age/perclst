# ts_test_strategist Reports Existing Tests as Missing

**Type:** Problem

## Context

When running `ts_test_strategist` on a file whose tests use the project's
standard describe-wrapping convention, the tool may report all functions as
untested even though a complete test file exists.

## What happened / What is true

`extractTestFunctions` in `src/repositories/parsers/tsParser.ts` extracted
only `it(...)` and `test(...)` line titles. `describe(...)` block titles were
ignored.

The project's test convention places the function name in the outer `describe`
and uses behaviour-describing labels in `it`:

```ts
describe('stringArrayRule', () => {   // function name lives here
  it('accepts an empty array', ...)   // behaviour label only
})
```

`findMatchingTest` searches extracted titles for a string that contains the
function name. Because `describe` titles were absent from the list, no title
matched `"stringarrayrule"` / `"string array rule"`, so `existing_test_function`
was always `null` and `missing_coverage` was always populated.

**Fix (commit 9b1e00c):** added `s.startsWith('describe(')` to the extraction
condition in `extractTestFunctions`. Describe block titles now appear in the
candidate list alongside `it`/`test` titles.

## Do

- When `ts_test_strategist` claims a function has no test, verify what
  `extractTestFunctions` actually returns before assuming coverage is missing.
- Place the function name in the outer `describe` title so the tool can match it.

## Don't

- Don't add the function name to individual `it` titles just to satisfy the
  tool — the describe title is the right place.
- Don't trust `missing_coverage: [...]` alone; cross-check with the test file.

---

**Keywords:** ts_test_strategist, extractTestFunctions, describe, existing_test_function, missing_coverage, test detection, tsParser

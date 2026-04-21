# it.each Usage Scope

**Type:** Discovery

## Context

When writing unit tests using Vitest, `it.each` is available for table-driven tests. This applies to any agent or developer writing tests in this codebase, particularly when using `ts_test_strategist` output to validate coverage.

## What happened / What is true

`it.each` was added to the unit-test-implementor skill but restricted to cases that meet **all three** of the following conditions:

1. Every row uses the same assertion shape (e.g., `toThrow(X)`)
2. All rows share the same failure reason and code path
3. There are 3 or more variants

The restriction exists because `it.each` increases the burden on reviewer agents that cross-check block count against `ts_test_strategist` output:

- With explicit `it` blocks: block count = case count, countable mechanically
- With `it.each`: the reviewer must read the table row count and interpret it — a two-step verification
- The "Cover all optional field types" check becomes especially difficult

Happy-path tests and `superRefine` combination tests are **not** suitable for `it.each` because expected values differ per row.

### Label-first convention

When `it.each` is appropriate, the first column must be a string label:

```ts
it.each([
  ['null', null],
  ['empty string', ''],
] as const)('rejects %s input', (_label, input) => { ... })
```

The `_label` is used only in the test name string — never inside the assertion body. Embedding raw values (`null`, `42`) in test names degrades readability.

## Do

- Apply `it.each` only when all three conditions are met (same assertion shape, same code path, ≥ 3 variants)
- Always put a string label as the first column in the table
- Use `%s` in the test name to interpolate the label

## Don't

- Don't use `it.each` for happy-path tests or tests where expected values differ per row
- Don't embed raw primitive values directly in test names — use a label column instead
- Don't use `it.each` when it would make reviewer-agent verification harder than explicit `it` blocks

---

**Keywords:** it.each, vitest, table-driven tests, test scoping, reviewer agent, label-first, ts_test_strategist, unit test

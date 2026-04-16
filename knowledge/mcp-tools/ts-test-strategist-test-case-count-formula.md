# ts_test_strategist: suggested_test_case_count Formula Excludes logicalOpCount

**Type:** Discovery

## Context

`ts_test_strategist` computes `suggested_test_case_count` to give consumers a rough
estimate of how many test cases a function warrants. The formula was deliberately scoped
to exclude one complexity metric.

## What happened / What is true

Formula:

```
1 + branchCount + (loopCount > 0 ? 1 : 0) + catchCount
```

`logicalOpCount` (counts of `&&`, `||`, `??`) is intentionally excluded.

Reason: logical operators contribute to cyclomatic complexity but are typically exercised
by the branch tests that already cover the surrounding `if`/ternary expression. Including
them would inflate the suggested count and produce redundant test cases.

## Do

- Use the formula above as the canonical definition of `suggested_test_case_count`
- Treat `logicalOpCount` as supplementary context, not as a multiplier for test cases

## Don't

- Don't add `logicalOpCount` to the formula — it causes inflation
- Don't interpret a high `logicalOpCount` alone as requiring additional dedicated tests

---

**Keywords:** ts_test_strategist, suggested_test_case_count, logicalOpCount, branchCount, loopCount, catchCount, cyclomatic complexity, formula

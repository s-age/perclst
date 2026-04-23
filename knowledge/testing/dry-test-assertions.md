# Avoid Repeating Baseline Assertions

**Type:** Discovery

## Context

Happy-path tests often verify the same baseline behavior (e.g., "function doesn't throw or error"). When multiple tests check different inputs against the same baseline expectations, repeating those assertions in every test violates DRY and makes tests harder to maintain.

## What happened / What is true

Test cases fall into two categories: establishing a baseline, and validating inputs. The first test in a group should establish the baseline with full assertions. Subsequent tests checking different inputs only need to verify their specific condition — the baseline is already established.

```typescript
// ✅ GOOD: Baseline established in test 1
it('should not exit when given empty array', () => {
  fn([])
  expect(spy).not.toHaveBeenCalled()
})

// Later tests don't repeat the same assertions
it('should not exit when given double-dash options', () => {
  fn(['--name', '--verbose'])  // Assertions implicit: returns normally
})
```

Function returning normally without throwing implicitly confirms it didn't call exit or error.

## Do

- Establish baseline assertions in the first happy-path test
- Document the baseline in a comment if unclear
- Omit redundant assertions from subsequent input-validation tests
- Only assert on behavior unique to that specific test

## Don't

- Repeat the same `expect(spy).not.toHaveBeenCalled()` across 4+ tests
- Assume readers remember the baseline from a test written earlier — add a comment
- Skip assertions entirely in later tests (at least document why)

---

**Keywords:** unit testing, assertions, DRY, test organization, redundancy, baseline

# Gotcha: Linter Enforces Explicit Assertions vs. DRY Principle

## Context

When refactoring tests to follow DRY principles (removing redundant baseline assertions from later tests), a linter or formatter automatically added those assertions back.

## What happened

1. Test review recommended removing `expect(spy).not.toHaveBeenCalled()` from tests 2-6 because test 1 establishes the baseline
2. Refactored the file to match this guidance
3. On subsequent runs, the linter/formatter automatically added the assertions back to all tests
4. This suggests the project has a formatting rule enforcing explicit assertions in every test case

## Gotcha

There's a tension between:
- **DRY principle**: Avoid repeating identical assertions across similar tests
- **Linter enforcement**: Explicitly assert in every test case for clarity and test isolation

The linter preference wins in this codebase. Even if later tests have redundant assertions, they remain for explicitness and to ensure each test is self-contained.

## Do

- When refactoring tests, check if the linter/formatter has rules about assertion placement
- Expect explicit assertions in every test, even if redundant with earlier tests
- Document this trade-off in comments if test structure seems repetitive

## Don't

- Remove assertions from tests assuming they're redundant (the linter may restore them)
- Assume DRY principles override clarity/explicitness in test files (they don't, in this project)

---

**Keywords:** testing, linter, DRY, assertions, trade-offs, formatter

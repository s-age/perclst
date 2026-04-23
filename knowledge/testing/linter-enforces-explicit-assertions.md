# Linter Enforces Explicit Assertions Over DRY

**Type:** Problem

## Context

When refactoring test files to remove redundant baseline assertions (e.g., `expect(spy).not.toHaveBeenCalled()` repeated across tests that share a common precondition), a linter or formatter rule restores them automatically. This creates apparent confusion when the linter silently undoes a deliberate DRY refactor.

## What happened / What is true

- A test review recommended removing repeated `expect(spy).not.toHaveBeenCalled()` from tests 2–6 because test 1 already establishes the baseline condition.
- After the refactor, a subsequent linter/formatter run added all the removed assertions back.
- The project's linter enforces that every test case carries its own explicit assertions, prioritizing clarity and isolation over brevity.
- **The linter preference wins** — redundant assertions are intentional and must remain.

## Do

- Keep explicit assertions in every test case, even when they appear redundant relative to an earlier test.
- Before removing assertions as DRY cleanup, verify that no linter rule will restore them.
- Add a comment in unusually repetitive test blocks explaining that the repetition is required by the linter.

## Don't

- Remove assertions from tests on the assumption that they are covered by an earlier test case.
- Assume DRY principles apply to assertions the same way they apply to production code.
- Treat linter-restored assertions as a bug — they reflect a deliberate project convention.

---

**Keywords:** testing, linter, DRY, assertions, test isolation, formatter, vitest, explicit assertions

# 100% Coverage Does Not Guarantee Test Quality

**Type:** Discovery

## Context

Applies when evaluating test suites for schemas, validators, or any module where correctness
depends on input variety rather than code-path volume. Relevant when a CI gate reports full
line/branch coverage but tests feel incomplete.

## What happened / What is true

Line and branch coverage only confirm that code was *executed* — not that the tests are
well-structured or semantically complete. All of the following defects pass 100% coverage:

- **Duplicate happy-path tests**: two `it` blocks asserting the same field with the same
  input — coverage is satisfied twice but no new behavior is verified.
- **Bundled assertions**: multiple `expect` calls for different inputs inside one `it`,
  hiding which specific case failed.
- **Missing wrong-type error paths**: optional fields with type constraints (boolean, int,
  enum) where no test passes the wrong type — the validator line executes via other inputs
  but the type-error branch is never triggered.
- **Missing valid combinations in `superRefine`**: cross-field logic may have valid input
  combinations never used as a happy-path test, even though every line of `superRefine`
  is reached via error-path tests.

These gaps are only caught by manual review or a strategist that reasons about schema
structure, not by coverage tooling alone.

## Do

- Use coverage as a minimum bar, not a quality signal
- Supplement with schema-aware test review: enumerate valid combinations, invalid types,
  and cross-field edge cases explicitly
- Treat `superRefine` logic as requiring dedicated happy-path tests, not just error paths

## Don't

- Don't treat a 100% coverage badge as proof that the test suite is complete
- Don't bundle multiple independent inputs into a single `it` block
- Don't skip wrong-type tests for optional fields just because a line is "already covered"

---

**Keywords:** coverage, 100%, test quality, superRefine, schema, bundled assertions, duplicate tests, type constraints, vitest

# Implement Pipeline Sub-type Procedure Mapping

**Type:** Discovery

## Context

The `implement` pipeline pattern has three sub-types. Each shares the same structural
shape (implement → review → test → commit) but differs in which procedures are assigned
to the implementer and reviewer agents.

## What is true

| Sub-type | Implementer procedure | Reviewer procedure |
|---|---|---|
| `implement-feature` | _(none — detailed `task` used instead)_ | `arch/review` |
| `implement-unit-test` | `test-unit/implement` | `test-unit/review` |
| `implement-integration-test` | `test-integration/implement` | `arch/review` |

- For `implement-feature`, the implementer agent has no `procedure` field. A detailed
  `task` description referencing the plan layer spec substitutes for it.
- For `implement-integration-test`, `procedures/test-integration/review.md` does not
  exist. The reviewer must use `arch/review`.

## Do

- Use `arch/review` as the reviewer for both `implement-feature` and
  `implement-integration-test`
- Omit the `procedure` field entirely for the implementer in `implement-feature`
- Use `test-unit/review` as the reviewer only for `implement-unit-test`

## Don't

- Don't add a `procedure` to the feature implementer agent — there is no
  `arch/implement` or equivalent procedure file
- Don't reference `test-integration/review` — the file does not exist and causes
  a procedure-not-found error at runtime

---

**Keywords:** implement-feature, implement-unit-test, implement-integration-test, procedure mapping, arch/review, test-unit/review, test-integration/review, pipeline sub-types

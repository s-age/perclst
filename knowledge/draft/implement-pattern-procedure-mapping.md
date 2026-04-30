# implement pattern: procedure mapping by sub-type

## Discovery

The `implement` pipeline pattern has three sub-types that share identical structure
but differ in which procedures are assigned:

| Sub-type | implementer procedure | reviewer procedure |
|----------|----------------------|-------------------|
| `implement-feature` | _(none — write detailed `task` instead)_ | `arch/review` |
| `implement-unit-test` | `test-unit/implement` | `test-unit/review` |
| `implement-integration-test` | `test-integration/implement` | `arch/review` |

## Gotcha: test-integration/review.md does not exist

`procedures/test-integration/` contains only `implement.md` — there is no `review.md`.
Integration test review pipelines must use `arch/review` as the reviewer procedure.
Do not invent `test-integration/review` — it will cause a procedure-not-found error at runtime.

## Gotcha: implement-feature implementer has no procedure

For `implement-feature`, the implementer agent omits `procedure` entirely and instead
receives a detailed `task` description referencing the plan layer spec. Adding a procedure
here is wrong — there is no `arch/implement` or similar procedure for feature implementation.

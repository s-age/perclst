# Tag Command: Empty Labels Array Fails Validation

**Type:** Discovery

## Context

When writing tests for the `tag` command, it is tempting to test "clearing labels by
passing an empty array" as a valid operation. This is not supported.

## What is true

`parseTagSession` uses `stringArrayRule({ required: true })`, which applies `.min(1)`.
Passing an empty `[]` fails validation and triggers `process.exit(1)` — it is an
error path, not a happy path.

Users cannot unset labels once assigned; they can only replace them with different values.

If clearing labels becomes a requirement, the options are:
1. Change to `stringArrayRule({ required: false })` in the schema.
2. Make the labels argument optional in the validator.
3. Add a dedicated `--clear-labels` flag.

## Do

- Treat empty-array input as an expected validation failure (error path test).
- Document the `.min(1)` constraint when writing plan test cases for `tag`.

## Don't

- Write a happy-path test for "empty array clears labels" — it will fail validation.
- Assume `required: true` on a string array allows zero-length input.

---

**Keywords:** tag command, labels, empty array, validation, stringArrayRule, required, min(1)

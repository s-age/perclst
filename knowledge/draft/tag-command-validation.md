# Tag Command: Empty Labels Array Validation

**Discovery**: The `tag` command rejects empty labels arrays during validation, not at the service layer.

## Details

When implementing `tag.integration.test.ts`, the plan listed "empty array clears labels" as a happy-path test case. However, `parseTagSession` uses `stringArrayRule({ required: true })`, which enforces `.min(1)` on the array — passing an empty `[]` fails validation and triggers `process.exit(1)`.

The validator enforces "at least one label must be provided", so clearing labels via empty array is not a supported operation. The test was removed to match actual behavior.

## Implications

If clearing labels is a desired feature, it would require:
1. Change `stringArrayRule({ required: false })` in the schema, OR
2. Split the labels argument into an optional field in the validator, OR
3. Add a dedicated `--clear-labels` flag to the command

Currently, users cannot unset labels once assigned — they can only update them to different values.

# ng_output_path Presence Is the Rejection Signal

**Type:** Problem

## Context

Pipeline procedures (e.g. `arch/review`, `test-unit/review`) use a file at `ng_output_path` as a binary rejection signal. The pipeline checks for the file's existence after the reviewer step: if the file is present, the review failed and the pipeline routes back to the implementer via `rejected.to`. This pattern is used anywhere a pipeline needs a structured pass/fail decision from an agent.

## What happened / What is true

The `arch/review` procedure's clean path (`ReportClean --> Done`) did not mention `ng_output_path`. An agent interpreted the silence as permission to write "✓ Clean" to the file. The pipeline detected the file and treated it as a rejection, looping the reviewer four times before the agent self-corrected.

## Do

- Explicitly state in the success path: **do not write to `ng_output_path`**
- Also instruct agents to **delete the file if it already exists** (stale from a prior run) before exiting the success path
- Treat every pipeline output file as opt-in: only write it when the failure condition is true

## Don't

- Leave the success path silent about `ng_output_path` — agents fill gaps with their own interpretation
- Assume "we just don't mention it" is equivalent to "do not create the file"

---

**Keywords:** ng_output_path, rejection signal, pipeline, procedure, pass/fail, arch/review, test-unit/review, review loop, agent interpretation

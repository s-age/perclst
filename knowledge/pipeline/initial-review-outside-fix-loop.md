# Place Initial Review Outside the Fix-Loop Pipeline

**Type:** Discovery

## Context

When building a review-fix pipeline (e.g. implement → review → build with retries),
there is a structural choice about where to put the first diagnostic review. Placing
it inside the retry boundary means it re-runs on every retry attempt, wasting tokens
and time even though the diagnosis does not change between retries.

## What happened / What is true

- A fix loop is modelled as a pipeline with a retry boundary: `implement → review → build`.
- The initial review (diagnosis step) belongs *outside* this pipeline as a separate
  preceding task.
- When the pipeline retries, only the implement/review/build cycle repeats; the
  initial diagnosis cost is not re-incurred.
- This separation also makes the pipeline's retry semantics cleaner: it retries the
  fix attempt, not the diagnosis.

## Do

- Put the initial diagnostic review in a task that runs before the fix-loop pipeline.
- Model the fix loop as its own pipeline with a retry count, starting from "implement".
- Keep the initial review result (e.g. an `ng_output_path` file) available as input
  for the fix loop's first implement step.

## Don't

- Don't include the initial review inside the retried pipeline — it will be repeated
  on every retry with no benefit.
- Don't conflate diagnosis (what is wrong?) with remediation (fix it and verify).

---

**Keywords:** pipeline, review, fix loop, retry, initial review, diagnosis, implement, cost, token efficiency

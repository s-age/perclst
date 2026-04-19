# Rejection detection requires ng_output_path to match .claude/tmp/{task.name}

**Type:** Discovery

## Context

`PipelineService` determines whether an agent step was rejected by checking for
the presence of a file at `.claude/tmp/{task.name}`. Review-style agents (e.g.
`review-arch`, `review-unit-test`) signal failure by writing violations to a
path called `ng_output_path`. If these two paths diverge, rejection is never
detected and the pipeline silently continues.

## What happened / What is true

- `review-arch` writes violations to the path specified by `ng_output_path`.
- `PipelineService.handleAgentRejection` checks for the file at
  `.claude/tmp/{task.name}`.
- When both values are the same string the check succeeds; when they differ
  the file is written somewhere `PipelineService` never looks, so rejection
  is ignored.
- `review-unit-test` follows the same rule and works correctly.

## Do

- Always set `ng_output_path: .claude/tmp/{task.name}` in pipeline task
  definitions for any review-type agent.
- Treat this as a project-wide convention: the task `name` field and the
  `ng_output_path` value must be kept in sync.

## Don't

- Don't use an arbitrary `ng_output_path` for review agents — rejection will
  silently fail.
- Don't rename a task without updating its `ng_output_path` (and vice versa).

---

**Keywords:** PipelineService, rejection, ng_output_path, task.name, review-arch, review-unit-test, convention, handleAgentRejection

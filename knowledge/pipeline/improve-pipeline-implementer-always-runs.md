# Improve Pipeline: Implementer Must Always Run on First Invocation

**Type:** Discovery

## Context

Applies to `improve` pipelines (e.g. `improve__skills__arch.json`) that loop between an
implementer and a reviewer. Distinct from `review-fix` pipelines where an initial reviewer
runs outside the nested loop and only creates `ng_output_path` when violations exist.

## What happened / What is true

In `review-fix` pipelines the implementer task description includes an early-exit guard:
"If `ng_output_path` does not exist, there are no issues to fix — exit immediately."
This is correct there because the pre-check reviewer only writes `ng_output_path` when
violations are found.

In `improve` pipelines there is no pre-check step. The implementer must run unconditionally
on the first iteration and produce output. The reviewer then decides whether the result is
good enough. `ng_output_path` only gets created on reviewer rejection — it does not exist
yet on the first run.

| Pipeline type | First-run behavior | `ng_output_path` semantics |
|---|---|---|
| `review-fix` | Exit if `ng_output_path` absent (nothing to fix) | Written by initial reviewer outside nested pipeline |
| `improve` | Always run — improve unconditionally | Written only on reviewer rejection |

The improve procedure handles this in its flowchart: "Does `ng_output_path` file exist?" →
if No, skip to ReadSkill (still runs). The task description must not include an early-exit
instruction.

## Do

- In `improve` pipelines, write the implementer task description so it always runs on the
  first pass, regardless of whether `ng_output_path` exists
- Let the improve-procedure flowchart control early-exit logic — trust the `ng_output_path`
  check in the procedure, not in the task description

## Don't

- Do not copy the "exit if `ng_output_path` absent" guard from a `review-fix` pipeline into
  an `improve` pipeline — the implementer will silently do nothing on its first run
- Do not assume `ng_output_path` semantics are the same across pipeline types

---

**Keywords:** improve pipeline, review-fix pipeline, ng_output_path, implementer, first run, early exit, pipeline type

# Rejection Loop State Is Keyed by Task Index, Not Task Name

**Type:** Discovery

## Context

When a pipeline task is rejected and routed back for retry, the runner must track which
tasks are pending rejection and how many retries each has consumed. The choice of key for
these maps matters for correctness.

## What happened / What is true

- The runner maintains:
  - `pendingRejections: Map<number, RejectedContext>` — tasks awaiting re-execution
  - `scriptRetryCount: Map<number, number>` — retry counters per task
- Both maps use **task index** (position in the pipeline array) as the key.
- Task names are **not** used as keys because the same task name can appear multiple times
  in a pipeline (e.g., two separate "implement" steps). Names are not unique; indices are.

## Do

- Key rejection and retry state by task index (array position).
- Treat task index as the stable, unique identifier for a pipeline task instance.

## Don't

- Don't key rejection maps by task name — duplicate names in a pipeline break uniqueness.
- Don't assume task names are unique within a pipeline definition.

---

**Keywords:** pendingRejections, scriptRetryCount, task index, rejection loop, pipeline retry, Map key

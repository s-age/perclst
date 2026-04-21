# Orchestrator `done: true` Skips Child Pipeline Entirely

**Type:** Problem

## Context

When managing orchestrator pipelines in perclst, child tasks can be marked with `done: true`
to signal they have already completed. This is commonly used when archiving finished pipelines
to a `done/` subdirectory. The flag has a non-obvious side-effect at runtime that can cause
confusion if you later try to re-run a child task.

## What happened / What is true

- Setting `done: true` on a `child` task in an orchestrator pipeline causes perclst to skip
  that child entirely at runtime — it will not execute even if the referenced pipeline file exists.
- Archived pipeline files are typically moved to `pipelines/done/`, but the orchestrator
  references child tasks by a `path` field pointing to `pipelines/<name>`.
- If `done: true` is removed to re-run a child task, but the pipeline file was only stored in
  `done/` and never existed at the root `pipelines/` path, the orchestrator will fail to find it.

## Do

- Before unsetting `done: true` on an orchestrator child task, verify the referenced `path`
  file exists in `pipelines/`.
- If the file is missing (e.g. it was only ever in `done/`), create or restore it at the
  expected path before running the orchestrator.

## Don't

- Don't assume removing `done: true` is sufficient to re-run a child — the pipeline file must
  also be present at the path the orchestrator expects.
- Don't rely on `done/` as a recoverable archive without a corresponding entry at the root path.

---

**Keywords:** orchestrator, done flag, child pipeline, skip, archive, pipeline path, re-run

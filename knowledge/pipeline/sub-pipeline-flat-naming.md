# Sub-Pipeline Files Use Flat Naming With Double-Underscore Separator

**Type:** Discovery

## Context

Applies when splitting a large feature pipeline into ordered sub-pipelines — one per layer or implementation phase. The project uses a specific flat-file naming convention rather than directories.

## What happened / What is true

- Sub-pipelines are named using the `__` double-underscore separator and a numeric prefix, all as flat files in `pipelines/`:
  ```
  pipelines/implement__pipeline-force-stop__01-foundation.json
  pipelines/implement__pipeline-force-stop__02-infra.json
  ```
- The `__` separator is already the project convention for pipeline hierarchy (the `done/` storage uses `__` → `/` conversion).
- A master pipeline at `pipelines/implement__pipeline-force-stop.json` chains sub-pipelines via `perclst run` script tasks.
- Subdirectories under `pipelines/` are **not** used for ordered sub-steps.

## Do

- Name ordered sub-pipelines as `<master-name>__<NN>-<phase>.json` flat in `pipelines/`
- Use numeric prefixes (`01`, `02`, …) to make execution order explicit

## Don't

- Create subdirectories under `pipelines/` to group sub-steps
- Omit the numeric prefix — without it, order is ambiguous

---

**Keywords:** pipeline, sub-pipeline, naming convention, double underscore, flat files, ordered steps, pipelines/

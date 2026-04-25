# Pipeline design: commit per loop, not once at the end

When a pipeline has multiple implement-review loops (e.g. refactor loop + unit test loop),
each loop should end with its own commit by the implementer — not a single commit at the end.

## Pattern

```
fix-loop (nested pipeline)
  implementer → reviewer → build gate
commit: implementer (resumed session)   ← refactor commit

unit-test loop (nested pipeline)
  test-implementer → test-reviewer → build gate
commit: test-implementer (resumed session)  ← test commit
```

## Why

- Each commit is focused and has a clear conventional message (refactor vs. test)
- The implementer that did the work commits it — full context, no hand-off
- Easier to bisect or revert one phase without the other
- Matches the "one job per agent" principle

## Gotcha

The naive approach is a single commit agent at the very end of the pipeline.
This works for single-loop pipelines but loses granularity in multi-loop ones.
meta-pipeline-creator's commit-pattern example shows one commit — extend it
to one commit per loop when loops have distinct concerns.

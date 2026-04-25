# Pipeline Design: One Commit Per Loop, Not One at the End

**Type:** Discovery

## Context

Applies to multi-loop pipelines (e.g. a refactor loop followed by a unit-test
loop). The question is when to commit — once per loop or once at the very end.

## What happened / What is true

The naive pattern is a single commit agent at the end of the pipeline. This works
for single-loop pipelines but loses granularity when loops have distinct concerns.

Preferred pattern:

```
fix-loop (nested pipeline)
  implementer → reviewer → build gate
commit: implementer (resumed session)       ← refactor commit

unit-test loop (nested pipeline)
  test-implementer → test-reviewer → build gate
commit: test-implementer (resumed session)  ← test commit
```

Each commit is made by the agent that did the work, in a resumed session, so it
has full context of the changes without a hand-off.

## Do

- End each loop with its own commit, made by the implementer for that loop.
- Use conventional commit messages that reflect the loop's concern
  (e.g. `refactor:` vs `test:`).
- Resume the implementer's session for the commit step so context is preserved.

## Don't

- Don't place a single commit agent at the end of a multi-loop pipeline — it
  loses per-phase granularity and makes bisecting harder.
- Don't extend `meta-pipeline-creator`'s single-commit example to multi-loop
  pipelines without adding a commit step per loop.

---

**Keywords:** pipeline, commit, loop, multi-loop, refactor, test, granularity, session, meta-pipeline-creator

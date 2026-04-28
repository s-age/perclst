# Per-File Commit Pattern in Implementation Pipelines

**Type:** Discovery

## Context

When generating a pipeline to implement multiple files (e.g. 19 integration test files),
placing a single commit agent at the end of the pipeline is the wrong approach.

## What is true

The correct cycle repeats **once per file**:

```
implementer → reviewer → script gate → committer (same name as implementer)
```

- The committer task reuses the implementer's `name` so `perclst resume` picks up that
  session — the agent retains full context of what it just wrote and why.
- A single end-of-pipeline commit bundles all files into one commit, losing per-command
  granularity in git history.
- If the pipeline is interrupted mid-run, already-verified files have no commits, and
  the committer at the end has no context about the first N files.

## Script gate command for CLI integration tests

```bash
npm run lint --fix && npm run build && npx tsc --noEmit 2>&1 && npm run test:unit
```

Note: `npx tsc --noEmit` is a separate type-check step beyond `npm run build`.

## Do

- Place one committer task immediately after the script gate for each implemented file.
- Reuse the implementer's session `name` in the committer task.

## Don't

- Use a single commit agent at the end of a multi-file pipeline.
- Skip the `npx tsc --noEmit` step — build success does not guarantee type correctness.

---

**Keywords:** pipeline, commit, per-file, implementer, committer, session name, script gate

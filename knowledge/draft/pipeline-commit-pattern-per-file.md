# Pipeline commit pattern: per-file commit, not end-of-pipeline

## Discovery

When generating an implementation pipeline for multiple files (e.g. 19 integration test files),
the natural instinct is to place a single commit agent at the very end of the pipeline.

This is wrong. The correct pattern is **one commit per implemented file**, placed immediately
after the script gate for that file.

## Correct cycle (repeat per file)

```
implementer → reviewer → script gate → committer (same name as implementer)
```

The committer task reuses the implementer's `name` so perclst resumes that session —
the agent retains context about what it just wrote and why.

## Why not a single end-of-pipeline commit

- A single commit at the end bundles all 19 files into one commit, losing per-command granularity.
- If the pipeline is interrupted mid-run, no commits have been made for already-verified files.
- The committer's context is the last implementer's session, which has no knowledge of the first 18 files.

## Script gate command for CLI integration tests

```
npm run lint --fix && npm run build && npx tsc --noEmit 2>&1 && npm run test:unit
```

Note: includes `npx tsc --noEmit` as a separate type-check step (not just `npm run build`).

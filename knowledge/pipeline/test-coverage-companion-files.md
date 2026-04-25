# Test Phase Misses Companion Files Created by Refactor

**Type:** Problem

## Context

Applies to any pipeline where a refactor phase extracts code into new co-located
files (e.g. `*.utils.ts` alongside the original hook file). The unit-test phase
targets only a single known file path, so dynamically created companion files go
untested unless explicitly handled.

## What happened / What is true

- `test-unit/implement` calls `ts_test_strategist` with a single `target_file_path`.
- When `arch-react-hooks__refactor` extracts pure functions into a `*.utils.ts`
  file, that new file is not known at pipeline-authoring time.
- If the test implementer only targets the original hook file, the extracted utils
  receive no test coverage.
- The current workaround in `arch-react-hooks__refactor.json` adds an explicit
  instruction in the task field:  
  > "also check for a co-located `*.utils.ts` — run `ts_test_strategist` on each
  > file that contains pure functions"
- This relies on agent discretion, not pipeline structure.

## Do

- Add explicit instructions in the test implementer's `task` field to discover and
  test companion files (e.g. `*.utils.ts`) co-located with the primary target.
- For a more robust solution, insert a `script` step between the refactor and test
  phases that captures created file paths from `git diff --name-only` and passes
  them to the test implementer as additional targets.

## Don't

- Don't assume `test-unit/implement` will automatically discover files created by
  a previous phase — it is file-scoped by design.
- Don't rely solely on agent discretion for coverage of dynamically created files
  in production pipelines.

---

**Keywords:** pipeline, test coverage, companion files, utils.ts, ts_test_strategist, refactor, dynamic targets, arch-react-hooks

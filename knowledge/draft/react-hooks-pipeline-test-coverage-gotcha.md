# Test phase limitation when refactor creates companion files

When the arch-react-hooks refactor procedure extracts pure functions into a
co-located `*.utils.ts` file, the unit test phase cannot cover it automatically.

`test-unit/implement` calls `ts_test_strategist` on a single `target_file_path`.
If the implementer only targets the original hook file, extracted utils go untested.

## Workaround used in arch-react-hooks__refactor.json

The test implementer's `task` field explicitly instructs the agent:
> "also check for a co-located *.utils.ts — run ts_test_strategist on each file that contains pure functions"

This relies on agent discretion, not pipeline structure. A more robust solution
would be a `script` step between refactor and test phases that writes discovered
file paths to a tmp file, and passes them to the test implementer as additional targets.

## Pattern note

This gotcha applies to any pipeline where a refactor phase creates new files whose
paths are not known at pipeline-authoring time. The `test-unit/implement` procedure
is file-scoped by design; pipelines that generate dynamic targets need either:
- Agent-level discovery (current workaround)
- A script gate that captures created files from git diff and feeds them forward

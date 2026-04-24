# MCP Tools Require Explicit Entries in Pipeline `allowed_tools`

**Type:** Problem

## Context

When a pipeline task runs a procedure that uses MCP tools (e.g. `ts_test_strategist`,
`ts_checker`), those tools must be individually listed in the task's `allowed_tools`
array. This applies any time automated, unattended pipeline execution is expected.

## What happened / What is true

- Generic entries like `Bash`, `Read`, or `Write` do **not** cover MCP tools.
- If an MCP tool is missing from `allowed_tools`, the pipeline stalls on a permission
  prompt mid-run, blocking automated execution indefinitely.
- The correct name format for MCP tools is `mcp__<server-name>__<tool-name>`
  (double underscores between each segment).

Example of a correct `allowed_tools` list that includes MCP tools:

```json
"allowed_tools": [
  "Read",
  "Write",
  "Bash",
  "mcp__perclst__ts_test_strategist",
  "mcp__perclst__ts_checker"
]
```

## Do

- List every MCP tool by its full `mcp__<server>__<tool>` name in `allowed_tools`
  for any pipeline task that may invoke it.
- Verify `allowed_tools` is complete before running a pipeline unattended.

## Don't

- Don't assume broad tool categories (`Bash`, `Read`) implicitly cover MCP tools.
- Don't omit MCP tool entries expecting a fallback approval mechanism — there is none
  in automated pipeline runs.

---

**Keywords:** mcp, allowed_tools, pipeline, permission prompt, ts_test_strategist, ts_checker, tool authorization, stall

# test-integration/implement Procedure Generalized for CLI and MCP

**Type:** Discovery

## Context

The `test-integration/implement` procedure was originally CLI-specific: STEP 1 read
`plans/cli-integration-tests.md`, and the classification step assumed CLI structure
(Pure session-management vs. Agent-wrapping). Applying it to MCP tools required generalization.

## What is true

The procedure was generalized to support both CLI commands and MCP tools in a single procedure —
no separate MCP variant was needed.

**Input branching by target type:**
- `target_command` → `src/cli/commands/__tests__/integration/<cmd>.integration.test.ts`
- `target_tool` → `src/mcp/tools/__tests__/integration/<tool>.integration.test.ts`

**Plan file dependency removed:** STEP 1 (reading `plans/cli-integration-tests.md`) was removed.
Test requirements are now specified directly in the pipeline task description via `test_cases:` and
`mock_boundary:`:

```yaml
task: >
  target_tool: knowledgeSearch

  test_cases:
    - happy path: query matches → matched entries returned
    - happy path: no match → empty result

  mock_boundary: none (place knowledge/*.md files in tmp dir)
```

This keeps all test requirements in one place and eliminates the dependency on a pre-existing plan
file. New layers can be supported by adding a new `target_*` branch without creating a new
procedure.

## Do

- Specify `target_tool` or `target_command` in the pipeline task description
- Include `test_cases:` and `mock_boundary:` directly in the task description

## Don't

- Don't create a separate MCP-specific procedure — use the generalized `test-integration/implement`
- Don't rely on `plans/cli-integration-tests.md` for MCP tool test parameters

---

**Keywords:** test-integration/implement, MCP tools, CLI, procedure generalization, target_tool, target_command, test_cases, mock_boundary, pipeline

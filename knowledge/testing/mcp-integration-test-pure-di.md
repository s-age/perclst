# MCP Integration Test: Pure DI Without Agent Spawn

**Type:** Discovery

## Context

Integration tests for MCP tools that do not call `agentService.start/resume` (no `claudeCodeInfra`
dependency). Applies to tools like `ts_analyze`, `ask_permission`, `git_pending_changes`, and
`knowledge_search`.

## What is true

These tools use full end-to-end DI with no `infras` overrides and no service stubs:

```ts
setupContainer({ config: buildTestConfig(dir) })
```

The full call chain runs: MCP tool → service → domain → repository → infrastructure.

- No `infras` override in `setupContainer`
- No `claudeCodeInfra` or `agentService.startSession()` call
- No JSONL parsing step
- Write real fixture files to tmpdir in each `it` block; repos that lazy-read files pick them up
  even if written after DI setup

Unlike CLI integration tests, there is no JSONL parsing or agent spawn. The test calls the tool
function directly and asserts `result.content[0].text`.

Errors from infrastructure (e.g., ts-morph file-not-found) propagate naturally — MCP tools do not
add try/catch for infrastructure failures.

## Do

- Use `setupContainer({ config: buildTestConfig(dir) })` with no overrides for pure data tools
- Write test fixtures to tmpdir in each `it` block, after calling `setupContainer` in `beforeEach`
- Call the tool function directly; assert on `result.content[0].text`

## Don't

- Don't stub at the service or infra layer for tools that do not invoke `agentService`
- Don't call `agentService.startSession()` or parse JSONL in MCP tool tests
- Don't add try/catch in MCP tools to swallow infrastructure errors

---

**Keywords:** mcp integration test, pure DI, no claudeCodeInfra, setupContainer, agentService, tool function, lazy read, tmpdir

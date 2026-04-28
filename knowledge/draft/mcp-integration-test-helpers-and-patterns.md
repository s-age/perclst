---
name: MCP integration test helpers and patterns
description: Test helper placement across layers and DI patterns for MCP tool integration tests
type: decision
---

## Test helper placement across layer boundaries

Generic test utilities (`makeTmpDir`, `buildTestConfig`) must live in a neutral location (`src/__tests__/`) rather than inside a layer-specific test directory (e.g., `src/cli/commands/__tests__/integration/`). This prevents forbidden cross-layer imports.

**Why:** MCP tests cannot import from `cli` test directories — it violates the architecture rule `mcp → cli/*` is forbidden, even in tests.

**How to apply:** When adding a test helper used by multiple layers:
1. Create it in `src/__tests__/` (layer-neutral)
2. If the helper is already in a layer-specific location, move it to `src/__tests__/` and have the original location re-export it
3. All layer tests import from `src/__tests__/helpers`
4. CLI tests using relative imports (`'./helpers'`) remain unaffected because the cli helpers file re-exports from the neutral location

## MCP integration test pattern for tools without claudeCodeInfra

Tools that don't spawn agents (no `agentService.start/resume`, no `claudeCodeInfra` dependency) use true end-to-end DI:

```ts
setupContainer({ config: buildTestConfig(dir) })
```

No infras overrides, no service-level stubs. The real DI graph constructs all layers including infrastructure.

**Why:** These tools test the full call chain (MCP tool → service → domain → repository → infrastructure). Mocking at service level would skip meaningful layer validation.

**How to apply:** For `ts_analyze`, `ask_permission`, `git_pending_changes` and similar stateless tools:
1. No `infras` override in `setupContainer`
2. Write real fixture files to tmpdir (via `makeTmpDir`)
3. Let the tool call the real service, which calls the real infrastructure
4. Errors from the infrastructure layer (e.g., ts-morph file not found) propagate naturally — no try/catch in the MCP tool itself

## File existence errors in ts-morph

`project.addSourceFileAtPath(filePath)` throws synchronously if the file doesn't exist. The error is **not** caught by the MCP tool — it propagates to the caller. In integration tests, this manifests as `rejects.toThrow()`.

**Why:** MCP tools don't add error handling for infrastructure failures — the SDK expects tool implementations to be correct, and infrastructure errors are exceptional.

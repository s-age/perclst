# MCP Integration Test Patterns

## Pattern: Class A — Pure DI Service Call (No Agent Spawn)

MCP tools don't invoke `agentService.start/resume`, so integration tests skip `claudeCodeInfra` entirely.

Full stack runs: `executeXxxTool → Service → Domain → Repository → Infra`

Example: `askPermission` test resolves the DI chain without agent calls.

## Discovery: Env Var Escapes for Clean Test Paths

`PermissionPipeRepository.askPermission()` checks `PERCLST_PERMISSION_AUTO_YES=1` before any I/O.

**Benefit**: Test the "happy approve" path with **zero mocks** — no infra override needed, just `setupContainer({ config })` and set the env var. This is cleaner than mocking TTY.

**Pattern**: Look for built-in env var test escapes in production code. They exist for testing.

## Pattern: Mock Boundary at Infrastructure Layer

For MCP tools, mock **where actual I/O happens** (infra), not at service/domain.

For `askPermission`:
- Approve path: Use `PERCLST_PERMISSION_AUTO_YES=1` (no I/O)
- Deny/error paths: Stub `TtyInfra` (the I/O boundary)

This tests the full business logic stack (service → domain → repo) while controlling external I/O.

## Gotcha: MCP Tool DI Setup

Unlike CLI integration tests, MCP tests use `setupContainer({ config, infras: { ... } })` directly — no `agentService.startSession()` or JSONL parsing.

The test wires up the real domain/repo/service layers; only the infra gets stubbed at the mock boundary.

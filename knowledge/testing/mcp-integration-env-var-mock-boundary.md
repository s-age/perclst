# Env Var Escapes and Mock Boundary in MCP Integration Tests

**Type:** Discovery

## Context

Some MCP tool integrations have built-in env var test escapes that eliminate the need for mocks on
the happy path. `PermissionPipeRepository.askPermission()` is the primary example.

## What is true

`PERCLST_PERMISSION_AUTO_YES=1` causes `askPermission` to auto-approve before any TTY I/O. This
allows testing the full stack with zero mocks — just `setupContainer({ config })`.

For paths that do require I/O control (deny/error), stub `TtyInfra` (the actual I/O boundary).

**Mock boundary rule for MCP tools:**
- Happy path with env var escape → no mocks at all
- Deny/error paths → stub at the infra layer (`TtyInfra`), not at service/domain
- This keeps all business logic (service → domain → repo) under real test coverage

Look for env var escapes in production code before reaching for mocks. They exist specifically for
testing.

## Do

- Check for built-in env var test escapes before writing mocks
- Use `PERCLST_PERMISSION_AUTO_YES=1` to test the approve path of `askPermission` without TTY setup
- Stub at the infra layer for paths that cannot use an env var escape

## Don't

- Don't mock TTY when an env var escape covers the happy path
- Don't stub higher than the infra layer unless the tool calls `agentService`

---

**Keywords:** env var escape, PERCLST_PERMISSION_AUTO_YES, askPermission, TtyInfra, mock boundary, infra stub, integration test

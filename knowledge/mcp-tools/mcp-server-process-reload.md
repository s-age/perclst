# MCP Server Process Does Not Reload dist/ Changes Automatically

**Type:** Problem

## Context

During local development, after modifying infrastructure code used by the MCP server, building
successfully, and having unit tests pass, MCP tool calls (e.g., via `ts_get_references`) may
still return stale or empty results. No errors appear — the failure is silent.

## What happened / What is true

- `TsAnalyzer.getReferences()` was enhanced to support `"ClassName.methodName"` lookups.
- Unit tests passed and the compiled output in `dist/` was confirmed to include the changes.
- Ad-hoc MCP tool calls returned empty results with no error messages.
- Root cause: the MCP server (`claude -p`) runs as a separate long-lived process. It loads
  compiled code once at startup and does not watch `dist/` for changes.
- The DI container in `src/core/di/setup.ts` creates singleton service instances once per
  session; those instances are reused across requests without reloading.
- Console output from infrastructure code does not surface in MCP tool responses, making
  silent failures hard to diagnose.

## Do

- Treat unit tests as the authoritative check for infrastructure-layer changes.
- Restart the MCP server process (restart the Claude Code session or the host process) after
  making changes to `dist/` that affect MCP tool behavior.
- When debugging silent empty MCP results, suspect a stale server process first.

## Don't

- Don't rely on ad-hoc MCP tool calls alone to verify infrastructure changes during development.
- Don't assume a successful build means the running MCP server reflects those changes.
- Don't add console logging in infrastructure code expecting it to appear in MCP tool output.

---

**Keywords:** MCP server, process cache, stale process, dist reload, DI container, singleton, ts_get_references, silent failure, server restart

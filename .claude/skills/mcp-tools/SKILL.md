---
name: mcp-tools
description: Use this skill when working with MCP server implementation, TypeScript analysis tools, permission prompts, or anything in src/mcp/. Covers the JSON-RPC server, ask_permission flow, and ts_* tools.
paths:
  - src/mcp/**
---

# MCP Server

## Files
- `src/mcp/server.ts` — JSON-RPC 2.0 server over stdio; handles `initialize`, `tools/list`, `tools/call`
- `src/mcp/types.ts` — TypeScript analysis result types (`TypeScriptAnalysis`, `ReferenceInfo`, etc.)
- `src/mcp/tools/ts_analyze.ts` — `executeTsAnalyze`: analyze file symbols/imports/exports
- `src/mcp/tools/ts_get_references.ts` — `executeTsGetReferences`: find all references to a symbol
- `src/mcp/tools/ts_get_types.ts` — `executeTsGetTypes`: get type definitions for a symbol
- `src/mcp/analyzers/project.ts` — `TypeScriptProject`: ts-morph based analysis engine

## Registered Tools

| Tool | Purpose |
|---|---|
| `ask_permission` | Permission-prompt-tool for headless claude sessions; reads from `/dev/tty` |
| `ts_analyze` | Analyze file structure (symbols, imports, exports) |
| `ts_get_references` | Find all references to a named symbol |
| `ts_get_types` | Get class/interface/function type definitions |

## Adding a New MCP Tool

1. Create `src/mcp/tools/<tool-name>.ts` and export an `execute*` function
2. Add the tool definition to the `TOOLS` array in `src/mcp/server.ts`
3. Add a `case '<tool-name>':` to the `tools/call` dispatcher in `server.ts`

## Permission Flow
- `ClaudeCLI` passes `--permission-prompt-tool mcp__perclst__ask_permission` to the claude process
- When claude needs permission for a built-in tool, it calls `ask_permission` via MCP
- The server opens `/dev/tty` and prompts the user interactively; auto-denies if no terminal is available

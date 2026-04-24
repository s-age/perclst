---
name: arch-mcp
description: "Required for any work in src/mcp/. Covers SDK-based server registration, executeXxx tool pattern, DI service resolution, content[] result format."
paths:
  - 'src/mcp/**/*.ts'
---

`src/mcp/` implements the perclst MCP server as a standalone process using `@modelcontextprotocol/sdk` over stdio. `server.ts` owns DI bootstrapping via `setupContainer()`, imports Zod schemas from `@src/validators/mcp/`, and registers all tools via `server.tool()`. Each tool lives in `tools/` as a single `executeXxx()` export that resolves a service from the DI container.

## Files

| File | Role |
|------|------|
| `server.ts` | Entry point — `setupContainer()`, `McpServer`, imports schemas from `@src/validators/mcp/`, registers tools via `server.tool()`, `StdioServerTransport` |
| `tools/askPermission.ts` | `executeAskPermission()` — delegates to `PermissionPipeService` via DI |
| `tools/tsAnalyze.ts` | `executeTsAnalyze()` — delegates to `TsAnalysisService` via DI |
| `tools/tsGetReferences.ts` | `executeTsGetReferences()` — delegates to `TsAnalysisService` via DI |
| `tools/tsGetTypes.ts` | `executeTsGetTypes()` — delegates to `TsAnalysisService` via DI |
| `tools/tsTestStrategist.ts` | `executeTsTestStrategist()` — delegates to `TestStrategistService` via DI |
| `tools/tsChecker.ts` | `executeTsChecker()` — delegates to `CheckerService` via DI |
| `tools/knowledgeSearch.ts` | `executeKnowledgeSearch()` — delegates to `KnowledgeSearchService` via DI |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di`, intra-mcp (`./`) | `cli`, `domains`, `repositories`, `infrastructures` |

Tool files under `tools/` must not use Node.js built-ins — I/O belongs in `infrastructures/` accessed via services.

## Patterns

**Tool file structure** — one `executeXxx()` export per file; result always wrapped in `content[]` with `type: 'text' as const`

```ts
export async function executeTsAnalyze(args: { file_path: string }) {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
  const result = service.analyze(args.file_path)
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}
// Bad: `type: 'text'` without `as const` — widens to string, fails TS2769 against CallToolResult
// Bad: returning plain object without content[] wrapper
```

**Registering a new tool in server.ts** — three additions: schema import from `validators/mcp/`, execute import, `server.tool()` call

```ts
import { myToolParams } from '@src/validators/mcp/myTool'
import { executeMyTool } from './tools/myTool'

server.tool('my_tool', 'Does something useful', myToolParams, ({ value }) => executeMyTool({ value }))
// Bad: inline Zod schema in server.ts — schemas belong in validators/mcp/
// Bad: TOOLS array + switch dispatcher — server.tool() from the SDK replaces both
```

**DI in tool execute functions** — resolve service singleton, never instantiate directly

```ts
const service = container.resolve<MyService>(TOKENS.MyService)
// Bad: new MyService() — separate instance, bypasses DI singleton
```

**Layered implementation** — tools only call a service; I/O in `infrastructures/`, business logic in `domains/`

## Verification

MCP tools run inside the server process and cannot be called from the main Claude Code session. After adding or modifying a tool:

1. **Build**: `npm run build` — catches type errors.
2. **Test via sub-agent**: Ask the user to run:

```bash
perclst start "Run ts_analyze on <file> and report the result" --allowed-tools ts_analyze Read --output-only
```

Replace `ts_analyze` and tool name as needed. Do not attempt to invoke MCP tools from the main session.

## Prohibitions

- Never import from `cli`, `domains`, `repositories`, or `infrastructures` — route through `services`
- Never return a raw object — always wrap in `{ content: [{ type: 'text' as const, text: string }] }`
- Never write `type: 'text'` without `as const` — causes `TS2769` against `CallToolResult`
- Never create a `TOOLS` array or `handleToolsCall` switch — `server.tool()` replaces both
- Never instantiate a service directly in a tool file — always `container.resolve<T>(TOKENS.X)`
- Never use Node.js built-ins in `tools/` files — I/O belongs in `infrastructures/` via services
- Never call `setupContainer()` more than once — exactly one call at the top of `server.ts`

## References

- [`references/ink-mcp-ipc.md`](./references/ink-mcp-ipc.md) — file-based IPC for permission prompts when MCP runs alongside a TUI that owns stdin

---
name: arch-mcp
description: "Required for any work in src/mcp/. Load before creating, editing, reviewing, or investigating files in this layer. Covers MCP server registration pattern, tool file structure, DI container usage, JSON-RPC result format, and the ask_permission inline tool."
paths:
  - 'src/mcp/**/*.ts'
---

## Role

Implements the perclst MCP server as a standalone process communicating over JSON-RPC 2.0 / stdio. `server.ts` owns protocol handling, DI bootstrapping, and tool dispatch. Each tool lives in `tools/` as a pair of exported schema object + execute function. `analyzers/` provides the `TypeScriptProject` singleton injected via DI. `types.ts` holds shared result types used only within this layer.

## Files

| File | Role |
|------|------|
| `server.ts` | Entry point — calls `setupContainer()`, registers `TypeScriptProject`, defines `TOOLS` array, implements JSON-RPC dispatch loop (`initialize`, `tools/list`, `tools/call`), contains `ask_permission` inline implementation |
| `types.ts` | Shared TypeScript analysis result types (`TypeScriptAnalysis`, `SymbolInfo`, `ReferenceInfo`, `TypeDefinition`, etc.) — used only within `src/mcp/` |
| `analyzers/project.ts` | `TypeScriptProject` class — wraps `ts-morph` `Project`; methods: `analyze()`, `getReferences()`, `getTypeDefinitions()` |
| `tools/tsAnalyze.ts` | Schema object `ts_analyze` + `executeTsAnalyze()` — delegates to `TypeScriptProject.analyze()` |
| `tools/tsGetReferences.ts` | Schema object `ts_get_references` + `executeTsGetReferences()` — delegates to `TypeScriptProject.getReferences()` |
| `tools/tsGetTypes.ts` | Schema object `ts_get_types` + `executeTsGetTypes()` — delegates to `TypeScriptProject.getTypeDefinitions()` |
| `tools/tsChecker.ts` | Schema object `ts_checker` + `executeTsChecker()` — delegates to `CheckerService` via DI |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di`, intra-mcp (`./`) | `cli`, `domains`, `repositories`, `infrastructures` |

Node.js built-ins (`fs`, `child_process`, `path`, `url`) are permitted only in `server.ts`, which is the standalone process entry point. Tool files under `tools/` must avoid Node.js built-ins and go through the DI container or services instead.

## Patterns

**Tool file structure** — one schema object + one execute function per file; result always wrapped in `content[]`

```ts
// Good — tools/tsAnalyze.ts: named export for schema, named export for executor
export const ts_analyze = {
  name: 'ts_analyze',
  description: 'Analyze TypeScript code structure (symbols, imports, exports)',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the TypeScript file to analyze' }
    },
    required: ['file_path']
  }
}

export async function executeTsAnalyze(args: { file_path: string }) {
  const project = container.resolve<TypeScriptProject>(TOKENS.TypeScriptProject)
  const analysis = project.analyze(args.file_path)
  return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] }
}

// Bad — returning a plain object without the content wrapper
export async function executeTsAnalyze(args: { file_path: string }) {
  const project = container.resolve<TypeScriptProject>(TOKENS.TypeScriptProject)
  return project.analyze(args.file_path)  // NG: MCP protocol requires content[] wrapper
}
```

**Registering a new tool in server.ts** — three edits always go together: TOOLS entry, switch case, import

```ts
// Good — add to TOOLS array (1), add import at top (2), add case in handleToolsCall (3)
import { executeMyTool } from './tools/myTool'

const TOOLS = [
  // ... existing tools ...
  {
    name: 'my_tool',
    description: 'Does something useful',
    inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] }
  }
]

async function handleToolsCall(id, params) {
  switch (p.name) {
    // ... existing cases ...
    case 'my_tool':
      result = await executeMyTool(p.arguments as { value: string })
      break
  }
}

// Bad — adding the execute function without updating TOOLS (tool stays invisible to callers)
// or adding to TOOLS without a switch case (dispatch silently sends "Unknown tool" error)
```

**Layered tool implementation — services → domains → infrastructures**

Tools that do more than delegate to `TypeScriptProject` must route through the full service stack. External I/O (file system, shell commands, ts-morph parsing) belongs in `infrastructures/`; business logic (rules, calculations, recommendations) belongs in `domains/`. Tool files only call a service via DI.

```ts
// Good — ts_test_strategist: tool → service → domain → repository → infrastructure
// infrastructures/tsParser.ts   raw AST traversal, returns structural counts (no domain logic)
// domains/testStrategy.ts       calcComplexity(), buildStrategy(), buildRecommendation()
// services/testStrategistService.ts  thin orchestration wrapper
// tools/tsTestStrategist.ts     resolves service, calls analyze(), wraps result

export async function executeTsTestStrategist(args: { target_file_path: string }) {
  const service = container.resolve<TestStrategistService>(TOKENS.TestStrategistService)
  const result = service.analyze({ targetFilePath: args.target_file_path })
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}

// Bad — computing cyclomatic complexity inside the infrastructure (business logic leak)
// infrastructures/tsParser.ts
export function parseFunctions(filePath: string) {
  // ...
  complexity = 1 + branches + loops  // NG: this formula is a business rule; belongs in domains/
}

// Bad — calling infrastructure directly from the tool file
export async function executeTsTestStrategist(args: { target_file_path: string }) {
  const funcs = parseFunctions(args.target_file_path)  // NG: bypasses service/domain layers
}
```

**DI container access in tool execute functions** — resolve the singleton, never instantiate directly

```ts
// Good — resolve TypeScriptProject from container registered in server.ts
export async function executeTsGetTypes(args: { file_path: string; symbol_name: string }) {
  const project = container.resolve<TypeScriptProject>(TOKENS.TypeScriptProject)
  const definition = project.getTypeDefinitions(args.file_path, args.symbol_name)
  if (!definition) {
    return { content: [{ type: 'text', text: `Type definition not found for symbol: ${args.symbol_name}` }] }
  }
  return { content: [{ type: 'text', text: JSON.stringify(definition, null, 2) }] }
}

// Bad — constructing TypeScriptProject directly in the tool (bypasses DI, creates duplicate project instances)
export async function executeTsGetTypes(args: { file_path: string; symbol_name: string }) {
  const project = new TypeScriptProject()  // NG: separate instance, not the DI-managed singleton
  return { content: [{ type: 'text', text: JSON.stringify(project.getTypeDefinitions(...)) }] }
}
```

**ask_permission is inline — no separate tool file**

`ask_permission` reads/writes `/dev/tty` directly in `server.ts`. It is the only tool without a `tools/` file because it requires direct TTY access that doesn't belong in a reusable module.

```ts
// Good — ask_permission lives entirely in server.ts alongside the tty helpers
async function askPermission(args: { tool_name: string; input: Record<string, unknown> }): Promise<PermissionResult> {
  const ttyFd = openSync('/dev/tty', 'r+')
  try {
    writeSync(ttyFd, prompt)
    // ... read answer ...
    return answer === 'y' ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'User denied permission' }
  } finally {
    closeSync(ttyFd)
  }
}

// Bad — moving ask_permission to tools/askPermission.ts
// NG: TTY interaction is server-level I/O, not a delegatable unit; tool files must not import 'fs' for I/O
```

## Verification

MCP tools cannot be called directly from the main Claude Code session — they run inside the MCP server process. After adding or modifying a tool:

1. **Build first**: `npm run build` — catches type errors before testing.

2. **Test via sub-agent**: MCP tools are only reachable from within a `claude -p` session that has the perclst MCP server configured. Ask the user to run:

```bash
perclst start "ts_test_strategist ツールを <対象ファイルパス> に対して実行して結果を報告してください。" --allowed-tools ts_test_strategist --output-only
```

Replace `ts_test_strategist` with the tool name being tested, and pass any additional tools the agent needs (e.g. `Read`) in `--allowed-tools`. Present this command to the user and ask them to execute it — do not attempt to run MCP tools yourself from the main session.

## Prohibitions

- Never import from `cli`, `domains`, `repositories`, or `infrastructures` — MCP is a peer of `cli`; business logic is accessed via `validators` and `services`, not through lower layers directly
- Never return a raw object from an execute function — always wrap in `{ content: [{ type: 'text', text: string }] }`
- Never add a tool to `TOOLS` without a matching `case` in `handleToolsCall`, and vice versa — the two must stay in sync
- Never instantiate `TypeScriptProject` directly in a tool file — always resolve via `container.resolve<TypeScriptProject>(TOKENS.TypeScriptProject)`
- Never use Node.js built-ins (`fs`, `child_process`, etc.) in `tools/` files — those files must stay I/O-free; I/O belongs in `infrastructures/` and is accessed via services
- Never add a second `setupContainer()` call — it is called exactly once at the top of `server.ts`

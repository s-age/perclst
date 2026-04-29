# MCP Tools Catalog

Tools exposed by `src/mcp/tools/` via the perclst MCP server.
Use these when working in `src/` — they reduce round-trips vs. manual file reading.

---

## `ts_analyze` — file surface map

**Source**: `src/mcp/tools/tsAnalyze.ts` → `executeTsAnalyze`
**Input**: `file_path: string`
**Output**: All symbols (functions, classes, variables) with types, constructor params, public methods; plus all imports and exports.

**When to use**: First step before writing tests or reviewing a file. Gives a complete symbol map without reading line by line.

> Note: `ts_analyze` only lists function-kind exports. `export const` and `export enum` exports are present in the symbols list but absent from the exports array — read the source file to confirm when in doubt.

---

## `ts_get_types` — symbol type signature

**Source**: `src/mcp/tools/tsGetTypes.ts` → `executeTsGetTypes`
**Input**: `file_path: string`, `symbol_name: string`
**Output**: Parameter types and return type for the named symbol.

**When to use**: When you need the exact signature of a function before calling or testing it.

---

## `ts_get_references` — call site finder

**Source**: `src/mcp/tools/tsGetReferences.ts` → `executeTsGetReferences`
**Input**: `file_path: string`, `symbol_name: string`, `include_test?: boolean` (default: false), `recursive?: boolean` (default: true)
**Output**: All call sites of the symbol. With `recursive: true`, follows callers up the chain.

**When to use**: Refactoring a function, assessing blast radius, understanding how a public API is used.

---

## `ts_call_graph` — downstream call tree

**Source**: `src/mcp/tools/tsCallGraph.ts` → `executeTsCallGraph`
**Input**: `file_path: string`, `symbol_name: string`
**Output**: Tree-formatted call graph showing all functions called by the named symbol (depth-first).

**When to use**: Understanding what a function does internally — trace the full execution path downward from an entry point. Complements `ts_get_references` (which goes upward).

---

## `ts_checker` — lint + build + test in one shot

**Source**: `src/mcp/tools/tsChecker.ts` → `executeTsChecker`
**Input**: `project_root?`, `lint_command?`, `build_command?`, `test_command?` (all optional, auto-detected)
**Output**: `{ ok: boolean, lint: {...}, build: {...}, test: {...} }`

Runs `npm run lint:fix` → `npm run build` → `npm run test:unit`.

**When to use**: After any TypeScript change — verifies correctness before reporting a task complete.

---

## `ts_test_strategist` — test coverage analysis

**Source**: `src/mcp/tools/tsTestStrategist.ts` → `executeTsTestStrategist`
**Input**: `target_file_path: string`, `test_file_path?: string` (auto-discovered if omitted)
**Output**: Untested functions, cyclomatic complexity per function, suggested mock dependencies, recommended test case counts.

**When to use**: Starting point for any unit test task.

---

## `knowledge_search` — knowledge base search

**Source**: `src/mcp/tools/knowledgeSearch.ts` → `executeKnowledgeSearch`
**Input**: `query: string` (AND/OR supported), `include_draft?: boolean` (default: false)
**Output**: Matching knowledge entries with title, path, matched keywords, and excerpt.

Query syntax: spaces = AND, `|` = OR. Example: `"session resume | session fork"`

**When to use**: Before starting any non-trivial task — check if a prior problem, gotcha, or decision is documented.

---

## `git_pending_changes` — uncommitted diff

**Source**: `src/mcp/tools/gitPendingChanges.ts` → `executeGitPendingChanges`
**Input**: `repo_path: string`, `extensions: string[]`
**Output**: Unified diff of uncommitted changes filtered to the given file extensions, or empty string if clean.

**When to use**: Pre-push review, checking what has changed before running `ts_checker`, or feeding diff context to an agent.

---

## `ask_permission` — TUI permission pipe

**Source**: `src/mcp/tools/askPermission.ts` → `executeAskPermission`
**Input**: `tool_name: string`, `input: Record<string, unknown>`, `tool_use_id?: string`
**Output**: `PermissionResult` — allow/deny decision from the TUI operator.

**When to use**: Called automatically by the MCP server when an agent requests a tool that requires approval. Not called directly in normal usage.

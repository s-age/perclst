# MCP Tools Catalog

Tools exposed by `src/mcp/tools/` via the perclst MCP server.
Use these when working in `src/` — they reduce round-trips vs. manual file reading.

---

## `ts_analyze` — file surface map

**Input**: `file_path: string`
**Output**: All symbols (functions, classes, variables) with types, constructor params, public methods; plus all imports and exports.

**When to use**: First step before writing tests or reviewing a file. Gives a complete symbol map without reading line by line.

---

## `ts_get_types` — symbol type signature

**Input**: `file_path: string`, `symbol_name: string`
**Output**: Parameter types and return type for the named symbol.

**When to use**: When you need the exact signature of a function before calling or testing it.

---

## `ts_get_references` — call site finder

**Input**: `file_path: string`, `symbol_name: string`, `include_test?: boolean` (default: false), `recursive?: boolean` (default: true)
**Output**: All call sites of the symbol. With `recursive: true`, follows callers up the chain.

**When to use**: Refactoring a function, assessing blast radius, understanding how a public API is used.

---

## `ts_checker` — lint + build + test in one shot

**Input**: `project_root?`, `lint_command?`, `build_command?`, `test_command?` (all optional, auto-detected)
**Output**: `{ ok: boolean, lint: {...}, build: {...}, test: {...} }`

Runs `npm run lint:fix` → `npm run build` → `npm run test:unit`.

**When to use**: After any TypeScript change — verifies correctness before reporting a task complete.

---

## `ts_test_strategist` — test coverage analysis

**Input**: `target_file_path: string`, `test_file_path?: string` (auto-discovered if omitted)
**Output**: Untested functions, cyclomatic complexity per function, suggested mock dependencies, recommended test case counts.

**When to use**: Starting point for any unit test task.

---

## `knowledge_search` — knowledge base search

**Input**: `query: string` (AND/OR supported), `include_draft?: boolean` (default: false)
**Output**: Matching knowledge entries with title, path, matched keywords, and excerpt.

Query syntax: spaces = AND, `|` = OR. Example: `"session resume | session fork"`

**When to use**: Before starting any non-trivial task — check if a prior problem, gotcha, or decision is documented.

---

## `ask_permission` — TUI permission pipe

**Input**: `tool_name: string`, `input: Record<string, unknown>`, `tool_use_id?: string`
**Output**: `PermissionResult` — allow/deny decision from the TUI operator.

**When to use**: Called automatically by the MCP server when an agent requests a tool that requires approval. Not called directly in normal usage.

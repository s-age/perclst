# MCP Server

perclst ships a built-in MCP server that provides two categories of tools:

- **Permission routing** (`ask_permission`) — intercepts permission prompts in headless sessions and routes them to the terminal interactively.
- **TypeScript analysis** (`ts_*`) — code structure, references, types, lint/build/test, and test strategy. Used for developing perclst itself; you can add your own tools to `src/mcp/tools/` and register them in `src/mcp/server.ts`.

## Setup

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "perclst": {
      "command": "node",
      "args": ["/path/to/perclst/dist/src/mcp/server.js"]
    }
  }
}
```

## Tools

### `ask_permission`

Route permission prompts to the terminal in headless (`claude -p`) sessions. In headless mode there is no interactive UI, so permission requests would silently block. This tool intercepts them and presents a `[y/N]` prompt via `/dev/tty`.

Called automatically by Claude Code — you do not invoke it directly.

| Input | Type | Required | Description |
|---|---|---|---|
| `tool_name` | string | yes | The tool requesting permission |
| `input` | object | yes | The input arguments for that tool call |
| `tool_use_id` | string | no | The unique tool use request ID |

---

### `ts_analyze`

Analyze the structure of a TypeScript file: exported symbols, imports, and class/function declarations.

| Input | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | yes | Path to the TypeScript file |

---

### `ts_get_references`

Find all references to a named symbol across the TypeScript project.

| Input | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | yes | Path to the file containing the symbol |
| `symbol_name` | string | yes | Name of the symbol to find references for |

---

### `ts_get_types`

Get the type definition for a named symbol in a TypeScript file.

| Input | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | yes | Path to the file containing the symbol |
| `symbol_name` | string | yes | Name of the symbol |

---

### `ts_checker`

Run lint (`lint:fix`), build, and unit tests in one shot and report errors/warnings for each stage. Use this after making TypeScript changes to verify correctness before completing a task.

All inputs are optional — commands and project root are auto-detected when omitted.

| Input | Type | Default | Description |
|---|---|---|---|
| `project_root` | string | auto-detected | Absolute path to the project root |
| `lint_command` | string | `npm run lint:fix` | Lint command |
| `build_command` | string | `npm run build` | Build command |
| `test_command` | string | `npm run test:unit` | Test command |

---

### `ts_test_strategist`

Formulate a unit test strategy for a TypeScript file. Identifies untested functions, calculates cyclomatic complexity, and suggests mocks for dependencies. Auto-discovers the test file when `test_file_path` is omitted.

| Input | Type | Required | Description |
|---|---|---|---|
| `target_file_path` | string | yes | Path to the TypeScript implementation file (`.ts` or `.tsx`) |
| `test_file_path` | string | no | Path to the corresponding test file (auto-discovered if omitted) |

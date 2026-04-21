# Turn Filtering Operates on TurnRow[], Not ClaudeCodeTurn[]

**Type:** Problem

## Context

Applies whenever adding filter flags (e.g. `--head`, `--tail`) to commands like
`perclst show` that render conversation turns as a table of rows. The distinction
between semantic domain objects (`ClaudeCodeTurn`) and display units (`TurnRow`)
matters here.

## What happened / What is true

- An initial implementation of `--tail N` sliced `ClaudeCodeTurn[]` in the domain layer.
- One `ClaudeCodeTurn` can expand into multiple display rows (e.g. thinking block +
  assistant text, or tool_use + tool_result pair).
- Slicing before flattening meant `--tail 1` could render 2 or more visible rows —
  contradicting the user's expectation that N means exactly N rows in the output.
- The fix: `flattenTurns` and `applyRowFilter` live in `src/utils/turns.ts` and
  operate on `TurnRow[]`. Filtering happens **after** flattening, in the CLI layer.
- `TurnRow` and `RowFilter` types are defined in `src/types/display.ts`.

## Do

- Apply row-level filters (head, tail, search) **after** calling `flattenTurns` —
  operate on `TurnRow[]`, not `ClaudeCodeTurn[]`.
- Place filter/sort utilities in `src/utils/` (pure functions, no I/O) so they are
  reusable by any future entry point (web UI, MCP tool).

## Don't

- Don't filter on domain objects (`ClaudeCodeTurn[]`) when the intent is to limit
  what the user *sees* in a table or list.
- Don't put display-expansion logic in the domain or repository layers.

---

**Keywords:** turn filtering, TurnRow, ClaudeCodeTurn, flattenTurns, applyRowFilter, --head, --tail, display layer, row filter, perclst show

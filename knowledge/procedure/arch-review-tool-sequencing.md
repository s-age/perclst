# Optimal Tool Sequencing for arch/review Agents

**Type:** Discovery

## Context

Architecture review agents have an optimal invocation order for MCP TypeScript tools.
Using the wrong order causes redundant file reads or misuse of tool APIs.

## What is true

**Correct order:**

1. `ts_analyze` (all target files in parallel) — yields `imports[]`, `symbols[]`,
   `exports[]` without reading source. Covers CHECK 1 (forbidden imports) and most
   of CHECK 2 (responsibility violations).
2. `ts_get_references(TOKENS.Xxx)` (parallel, new/changed symbols only) — verifies
   DI tokens are actually consumed somewhere in `src/cli/` or `src/mcp/`.
3. `ts_get_types(ClassName)` (targeted) — verifies implements clauses or type
   signatures at layer boundaries.
4. `Read` (last resort) — only when exact code lines are required for a violation
   report.

**Dead registration pattern (CHECK 3 extension):** A token registered in `setup.ts`
but never resolved anywhere is a dead registration — the feature is wired but not
reachable. `ts_get_references(TOKENS.Xxx)` detects this. Added to CHECK 3 of
`procedures/arch/review.md` as of 2026-04-25.

## Do

- Run `ts_analyze` on all target files in a single parallel batch first.
- Call `ts_get_references` only for tokens whose classes appear in the current review
  scope (changed or newly added).
- Add a dead registration check (CHECK 3) using `ts_get_references` for all new DI
  tokens.

## Don't

- Don't call `ts_get_types` to enumerate a file's symbols — it requires a specific
  `symbol_name` and cannot list symbols. Use `ts_analyze` for enumeration.
- Don't call `ts_get_references` for all 40+ tokens — scope it to the target path.
- Don't `Read` source files before exhausting TS tool results; it adds context noise.

---

**Keywords:** arch-review, ts_analyze, ts_get_references, ts_get_types, tool-sequencing, dead-registration, DI-tokens, procedure

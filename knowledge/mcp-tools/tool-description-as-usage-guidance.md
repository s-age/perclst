# MCP Tool Descriptions Are the Right Place for Usage Guidance

**Type:** Discovery

## Context

When writing MCP tools in `src/mcp/server.ts`, there is a temptation to document
when/why/how to use each tool in a separate file (e.g. `.claude/rules/mcp-tools.md`
or a CLAUDE.md table). This creates duplication and staleness risk.

## What happened / What is true

Claude receives every MCP tool's name and description at session start via the MCP
protocol handshake. This means any guidance written in the `description` argument of
`server.tool('name', 'description', ...)` is automatically in context — no separate
rules file or CLAUDE.md section is needed.

Enriching tool descriptions with structured When/Why/How content and removing the
separate `.claude/rules/mcp-tools.md` table yields:

- **Single source of truth** — `server.ts` is already the authoritative tool registry
- **No staleness** — descriptions update when the tool updates, by definition
- **No context overhead** — guidance arrives via the MCP handshake, not a loaded file
- **No duplication** — a rules table is always a copy of `server.ts`

## Do

- Write tool descriptions in `server.ts` as:
  `'What it does (brief). When: <trigger>. Why: <benefit>. How: <what to do with result>.'`
- Remove any parallel documentation file that mirrors tool descriptions

## Don't

- Don't maintain a `.claude/rules/mcp-tools.md` or CLAUDE.md table that duplicates
  tool descriptions from `server.ts`
- Don't add bare one-line descriptions when the tool has non-obvious usage patterns

---

**Keywords:** mcp, tool description, usage guidance, server.ts, rules, CLAUDE.md, single source of truth, handshake, context

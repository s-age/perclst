# Skill vs. Procedure for Test Writing

**Type:** Discovery

## Context

The project supports two mechanisms for writing unit tests: a **procedure** (`test-unit`) that runs a full sub-agent loop, and a **skill** (`unit-test-implementor`) that injects inline conventions. Understanding which one applies — and that they are complementary, not redundant — prevents drift from project conventions.

## What happened / What is true

- **Procedure** (`procedures/test-unit.md`): a full agent workflow that uses the MCP tool `ts_test_strategist`, runs `ts_checker`, and loops until tests pass. Invoked via `perclst start --procedure test-unit`.
- **Skill** (`.claude/skills/unit-test-implementor/SKILL.md`): inline conventions loaded when Claude edits `*.test.ts` directly. Covers import style, mock patterns, and case structure. No MCP tools, no agent loop.
- The skill fills the gap when Claude writes tests directly (not via a sub-agent). Without it, Claude may drift from project conventions — e.g. using globals instead of explicit `vitest` imports, or mocking at the wrong scope.
- The skill is named `unit-test-implementor` (not `test-writer`) to clearly map to the `test-unit` procedure and limit scope to unit tests only.

## Do

- Use the `test-unit` procedure when delegating test creation to a sub-agent that should iterate until passing.
- Load the `unit-test-implementor` skill (or rely on auto-loading) when writing or editing `*.test.ts` files inline.
- Keep the skill name aligned with the procedure name to make the pairing obvious.

## Don't

- Don't assume the skill replaces the procedure — they operate at different layers.
- Don't use a generic name like `test-writer` for the skill; it loses the scope/procedure mapping.
- Don't skip the skill when editing tests inline — convention drift accumulates quickly without it.

---

**Keywords:** skill, procedure, test-unit, unit-test-implementor, vitest, test writing, mock patterns, sub-agent, inline conventions

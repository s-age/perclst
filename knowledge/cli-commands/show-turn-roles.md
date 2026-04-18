# Show Command Turn Role Design

**Type:** Discovery

## Context

The `perclst show` command displays session history in a table. Each row represents one turn,
and each turn is annotated with a role name. This applies whenever interpreting or extending
the display layer of `perclst show`.

## What happened / What is true

- Turn roles were split into `tool_use` and `tool_result` instead of a single `tool` role.
- Tool calls have two distinct phases: **request** (tool name + input) and **response** (result).
  Collapsing both into one role made each row's meaning ambiguous.
- The role names mirror the Claude API message structure (`content block type`), so agents
  reading the output can interpret them using existing knowledge of the API.
- Full role set: `user` / `thinking` / `tool_use` / `tool_result` / `assistant`
- When `--format json` is used, `summary.turns` (`ClaudeCodeTurn[]`) is merged into the session
  metadata object — this is intentional to support downstream agent pipe-parsing.

## Do

- Use `tool_use` for the call phase and `tool_result` for the response phase when labelling turns.
- Keep role names aligned with Claude API `content block type` values.
- Include `summary.turns` in the JSON output so agents can parse turn history without a separate request.

## Don't

- Don't collapse `tool_use` and `tool_result` into a single `tool` role — it loses phase information.
- Don't invent role names that diverge from the Claude API vocabulary; consistency aids agent interpretation.

---

**Keywords:** show command, turn roles, tool_use, tool_result, display layer, JSON format, ClaudeCodeTurn, perclst show

# Turns Breakdown: Semantic Field Definitions

**Type:** Discovery

## Context

The `analyze` command's `turnsBreakdown` object was redesigned to make each field
semantically precise. This matters when reading session analysis output or writing
code that interprets turn counts.

## What happened / What is true

**Old schema** — opaque, conflated concepts:
```
userInstructions + toolUse×2 + assistantResponse
```

**New schema** — explicit, semantic:
```
User Instructions / Thinking / Tool Calls / Tool Results / Assistant Response
```

Field definitions:

| Field | Meaning |
|---|---|
| **User Instructions** | Entries with `role: user` (excluding tool results) |
| **Thinking** | Model inference steps where `stop_reason = tool_use` (chose to call a tool) |
| **Tool Calls** | Total individual tool invocations (parallel calls in one step count separately) |
| **Tool Results** | One per tool call (1:1 correspondence with Tool Calls) |
| **Assistant Response** | Final inference steps where `stop_reason = end_turn` (text reply to user) |

The total is preserved: `1 + 12 + 13 + 13 + 1 = 40` equals the old `1 + 13×2 + 13 = 40`.

**Why `toolUse×2` was wrong:** it hid the conceptual distinction between a tool
invocation (call) and its return value (result). The ×2 also made parallel tool
calls impossible to represent faithfully.

**Why `assistantResponse` was misleading:** a session where the model makes 12 tool
calls before replying produced `assistantResponse: 13`, implying 13 user-visible
replies when only 1 existed.

## Do

- Treat `Thinking` as intermediate inference steps, not user-visible responses
- Count parallel tool calls individually under `Tool Calls`
- Use `stop_reason` to distinguish Thinking steps (`tool_use`) from
  Assistant Responses (`end_turn`)

## Don't

- Don't count tool-call inference steps as "assistant responses"
- Don't conflate tool calls and tool results into a single `toolUse` field

---

**Keywords:** turnsBreakdown, analyze, turn count, thinking, tool_use, tool_result, stop_reason, end_turn, assistant response, session analysis

# Claude Code JSONL Session File Structure

**Type:** Discovery

## Context

Claude Code writes session history as JSONL files. Understanding how entries map to
API calls is essential for correctly parsing turns, counting metrics, and building
session analysis tools.

## What happened / What is true

One API call produces **multiple JSONL entries**, one per content block:

| Content block | JSONL role |
|---|---|
| Thinking (extended thinking) | `assistant` |
| Text response | `assistant` |
| Tool use | `assistant` |
| Tool result | `user` |

All assistant-role blocks from a single API call share the same position in the
sequence. `buildTurns` flushes accumulated assistant entries into one `ClaudeCodeTurn`
each time a `user` entry arrives.

`tool_result` entries are written as `user` role, so they act as flush triggers —
each tool result boundary closes the current assistant group and starts a new turn.

`mergeAssistantGroup` is responsible for collapsing consecutive `assistant` entries
(thinking → text → tool_use) into a single `ClaudeCodeTurn`, which means one turn
may carry non-empty `toolCalls` **and** a non-empty `assistantText` simultaneously.

## Do

- Treat each flush (user entry received) as the boundary of one `ClaudeCodeTurn`
- Expect `toolCalls` and `assistantText` to co-exist in a single turn

## Don't

- Don't assume one JSONL entry equals one API call
- Don't assume `assistantText` and `toolCalls` are mutually exclusive within a turn

---

**Keywords:** JSONL, Claude Code, session file, buildTurns, mergeAssistantGroup, tool_result, assistant role, turn boundary

# API Calls Is the Meaningful Session Metric

**Type:** Discovery

## Context

When analyzing Claude Code session stats, there is a temptation to use "turns" (total
`ClaudeCodeTurn` count) as the primary metric for session length or cost. This metric
is misleading and should be replaced with **API Calls**.

## What happened / What is true

`ClaudeCodeTurn.total` (formerly "Turns (total)") sums
`userInstructions + thinkingSteps + toolCalls + toolResults`, which does not reflect
actual LLM request count.

**API Calls** is the count of `ClaudeCodeTurn` entries that carry assistant content:
```
toolCalls.length > 0 || assistantText !== undefined
```

Why API Calls matters: each LLM request re-sends the full conversation history.
As a session grows longer, each individual request costs more tokens. Tracking API
Calls gives an accurate picture of both cost and session complexity.

`total` was updated to: `userInstructions + apiCalls + toolCalls + toolResults`

## Do

- Use `apiCalls` as the primary metric for session length and cost estimation
- Count a `ClaudeCodeTurn` as an API Call when `toolCalls.length > 0 || assistantText !== undefined`

## Don't

- Don't treat raw `ClaudeCodeTurn` total as equivalent to LLM request count
- Don't use "turns" or "thinkingSteps" as cost proxies — they conflate distinct event types

---

**Keywords:** apiCalls, turns, metric, ClaudeCodeTurn, session cost, LLM requests, buildSummaryStats

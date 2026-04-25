# else-if Bug Undercounts assistantResponse in Turn Stats

**Type:** Problem

## Context

In `buildSummaryStats`, turns were categorized with an `if / else if` chain to count
`thinking` steps vs `assistantResponse` entries. This caused `assistantResponse` to
be silently undercounted whenever a turn contained both tool calls and assistant text.

## What happened / What is true

`mergeAssistantGroup` merges consecutive JSONL assistant entries (thinking → text →
tool_use) into a single `ClaudeCodeTurn`. This means one turn can have **both**
`toolCalls.length > 0` and `assistantText !== undefined` simultaneously.

The old code:
```ts
if (turn.toolCalls.length > 0) {
  thinking++
  // ...
} else if (turn.assistantText !== undefined) {
  assistantResponse++
}
```

When `toolCalls` was non-empty, the `else if` branch was skipped, so `assistantText`
was never counted — producing an incorrect `assistantResponse` count.

Fix: replace `else if` with an independent `if`, and consolidate both cases into the
single `apiCalls` counter (see `api-calls-metric.md`).

## Do

- Use independent `if` statements when multiple properties of a turn can be truthy at once
- Consolidate `thinking` + `assistantResponse` into a single `apiCalls` counter

## Don't

- Don't use `else if` to categorize turn types that can co-occur in the same `ClaudeCodeTurn`

---

**Keywords:** else-if, buildSummaryStats, assistantResponse, thinking, undercounting, ClaudeCodeTurn, mergeAssistantGroup

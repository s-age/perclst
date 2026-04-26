# messages_total: API Message Count, Not Turn Count

**Type:** Discovery

## Context

When reading `perclst analyze` output or working with the `messages_total` field in
`agentRepository.ts`, the value may seem much higher than expected for a short session.
This applies to any code that reads, computes, or displays `messages_total`.

## What happened / What is true

`messages_total` counts **API messages**, not conversational turns. One session with a
single user prompt and several tool calls produces many API messages:

- +1 per user instruction (the prompt)
- +1 per assistant response turn (thinking/text/tool entries merged per API call)
- +2 per tool call (one `tool_use`, one `tool_result`)

Formula: `1 + 1 + 2N` for a single-turn session with N tool calls.

**How it's computed** (`agentRepository.ts`):

- Pre-run baseline: `computeMessagesTotalFromContent(jsonlContent)` parses existing JSONL
- During streaming: `ParseState.assistantEventCount` and `ParseState.toolCallCount` track new events
- Post-run: `messages_total = baselineMessagesTotal + 1 + assistantEventCount + 2 * toolCallCount`

The consistency test in `turnsConsistency.test.ts` verifies this formula against
`computeMessagesTotalFromContent` on equivalent full JSONL content.

## Do

- Treat `messages_total` as an API-level message count when interpreting session stats
- Use the formula above when estimating cost or budget for tool-heavy agents
- Check `turnsConsistency.test.ts` when modifying the computation logic

## Don't

- Don't assume `messages_total` equals the number of user/assistant conversational turns
- Don't confuse `messages_total` with `turns_total` — `turns_total` no longer exists

---

**Keywords:** messages_total, API message count, tool call count, assistantEventCount, toolCallCount, agentRepository, computeMessagesTotalFromContent, ParseState, perclst analyze

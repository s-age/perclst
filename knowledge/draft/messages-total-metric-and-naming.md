# messages_total metric: what it counts and why the name changed

## What happened

`turns_total` / `max_turns` / `--max-turns` were renamed to `messages_total` / `max_messages` /
`--max-messages` (including config key `max_messages` replacing `max_turns`).

## What messages_total actually counts

The value is **not** a count of conversational turns. It is an API message count:
- +1 per user instruction (the prompt)
- +1 per assistant response turn (after merging thinking/text/tool entries for the same API call)
- +2 per tool call (one for the tool_use, one for the tool_result)

This matches what `perclst analyze` displays as "Messages (total)". One tool-heavy run with
N tool calls produces `1 + 1 + 2N` even though the user had only one turn.

## How it's computed

Pre-run: `computeMessagesTotalFromContent(jsonlContent)` parses the existing JSONL baseline.

During streaming: `ParseState.assistantEventCount` and `ParseState.toolCallCount` track new
assistant events with content and new non-permission tool uses respectively.

Post-run formula (in `agentRepository.ts`):
```
messages_total = baselineMessagesTotal + 1 + assistantEventCount + 2 * toolCallCount
```

The consistency test in `turnsConsistency.test.ts` verifies this formula against
`computeMessagesTotalFromContent` on equivalent full JSONL content for multiple scenarios.

## Config migration note

Existing `.perclst/config.json` files using `limits.max_turns` must be updated to
`limits.max_messages`. Pipeline YAML files using `max_turns` on agent tasks must also change
to `max_messages`. The CLI flag `--max-turns` is now `--max-messages`.

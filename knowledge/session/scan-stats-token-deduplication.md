# Token Deduplication in scanStats: Overwrite, Not Accumulate

**Type:** Discovery

## Context

`scanStats()` counts total tokens across a JSONL session file. Claude Code writes the same
`usage` object into multiple consecutive entries for a single API call (thinking, text, and
tool_use entries all carry identical usage figures). Naively summing every `usage` field
inflates the count by 2–3×.

## What happened / What is true

Claude Code emits consecutive `assistant` entries for one API call — one for `thinking`, one
for `text`, one per `tool_use` block. Each entry carries the same `usage`
(input_tokens, output_tokens). These form an "assistant group."

`scanStats()` applies the same deduplication rule as `mergeAssistantGroup`:

- **Within a consecutive assistant group**: overwrite (keep the last `usage` value seen, discard earlier ones)
- **Across groups**: accumulate normally

Taking the last entry's usage yields exactly one count per API call, which is correct.

## Do

- When aggregating token usage from JSONL, track whether you are inside a consecutive
  `assistant` group and overwrite `usage` until the group ends.
- Mirror the `mergeAssistantGroup` overwrite rule in any new scanning or aggregation function.

## Don't

- Don't sum every `usage` field found in the JSONL — consecutive assistant entries share a
  single API call and must not be accumulated independently.

---

**Keywords:** scanStats, token counting, deduplication, mergeAssistantGroup, JSONL, assistant group, usage, overwrite, input_tokens, output_tokens

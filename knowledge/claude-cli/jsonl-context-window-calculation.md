# Claude Code JSONL: Correct Formula for Current Context Window Usage

**Type:** Discovery

## Context

When building a session viewer or token usage reporter on top of Claude Code JSONL files,
it is tempting to sum all usage entries across the session. That produces the **cumulative
API cost**, not the current context window consumption — they are different metrics.

## What happened / What is true

**Current context window consumption** = the last API call's:

```
input_tokens + cache_read_input_tokens + cache_creation_input_tokens
```

This represents what was sent to the model on the most recent turn.

**Cumulative session usage** = sum of `output_tokens` (or billing tokens) across all API
calls in the session. This is a billing/throughput metric, not a "how full is the window"
metric.

Claude Code itself uses the single-call approach. In `src/utils/tokens.ts`,
`getCurrentUsage(messages)` reads `message.usage` from the last assistant message only —
it does not accumulate across history.

## Do

- To report "context window used so far": read `usage` from the last assistant JSONL entry
- Use `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` from that
  single entry

## Don't

- Don't sum input token counts across all JSONL entries to get context usage — that
  produces a meaningless inflated number
- Don't conflate cumulative session cost with current window fill level

---

**Keywords:** context window, token usage, input_tokens, cache_read_input_tokens, cache_creation_input_tokens, getCurrentUsage, tokens.ts, cumulative, session cost, jsonl

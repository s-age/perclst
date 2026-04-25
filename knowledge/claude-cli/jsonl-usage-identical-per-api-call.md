# Claude Code JSONL: Usage Fields Are Identical Across All Entries in One API Call

**Type:** External

## Context

Claude Code session JSONL files emit one entry per content block type (thinking, text,
tool_use) for each API response. All entries belonging to the same API call carry an
**identical** `usage` object. Any code that accumulates token counts across these entries
must account for this or it will double/triple-count.

## What happened / What is true

A single API response that produces three content blocks writes three JSONL entries, each
with the same usage values:

```
[thinking entry]  → usage: {input_tokens: 2, output_tokens: 376, cache_read: 10672, cache_creation: 7755}
[text entry]      → usage: {input_tokens: 2, output_tokens: 376, cache_read: 10672, cache_creation: 7755}
[tool_use entry]  → usage: {input_tokens: 2, output_tokens: 376, cache_read: 10672, cache_creation: 7755}
```

Using `+=` to accumulate usage while iterating consecutive assistant entries inflates all
token counts by the number of entries in the group (2–3×).

**Fix:** Within a group of consecutive assistant entries, assign (`=`) rather than
accumulate (`+=`). All entries carry the same value — the last one is authoritative.

```typescript
// Correct: overwrite, don't add
acc.tokens = result.tokenDeltas;

// Wrong: inflates counts 2–3x
acc.tokens += result.tokenDeltas;
```

## Do

- Assign (`=`) usage from the last entry in a consecutive assistant group
- Treat the usage object as a property of the **group**, not of each individual entry

## Don't

- Don't `+=` usage across entries that belong to the same logical API call
- Don't assume each JSONL entry represents a separate billing event

---

**Keywords:** jsonl, usage, tokens, deduplication, cache_read, cache_creation_input_tokens, double-counting, accumulation, assistant entries, token delta

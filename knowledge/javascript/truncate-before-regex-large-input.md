# Truncate Large Strings Before Regex or String Processing

**Type:** Discovery

## Context

String operations like `.trim().replace(/\s+/g, ' ')` on arbitrarily large inputs
(e.g. tool results, bash output) are an allocation hazard. Applying them before any
length limit means the full multi-MB string is processed even though only a few display
lines are ever shown.

## What is true

In `formatStreamLines`, the formatter called `.trim().replace(/\s+/g, ' ')` on the full
tool result string — which can be 1 MB+ (file reads, bash output). Only 3 display lines
are ever rendered.

Fix: slice the string to `MAX_STREAM_INPUT` chars (600) **before** any regex processing.
This avoids creating large intermediate strings entirely.

Reference: `src/cli/components/parts/PipelineRunner/utils.ts` — `formatStreamLines`.

## Do

- Apply a `str.slice(0, MAX_CHARS)` guard before any `.trim()`, `.replace()`, or
  regex operations on strings that may be unbounded.
- Set `MAX_CHARS` based on the maximum useful display size, not an arbitrary large number.

## Don't

- Process the full string and then trim the result — the damage is already done.
- Assume tool results or bash output are bounded in length.

---

**Keywords:** truncate, regex, string processing, formatStreamLines, MAX_STREAM_INPUT, performance, allocation, large input

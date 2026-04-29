# Pure Parser Functions Require No Infrastructure Mocks

**Type:** Discovery

## Context

Parser functions in `src/repositories/parsers/` that accept raw strings or arrays (JSONL input)
are pure — no DI dependencies, no filesystem access, no external calls. Integration tests for
these functions only need constructed input strings passed directly.

## What happened / What is true

- `computeMessagesTotalFromContent(raw: string)` and `scanStats(raw: string)` went from 0% to
  full coverage with plain JSONL string fixtures — no `setupContainer`, no service stubs needed.
- `computeMessagesTotal` was dead code (exported but never imported anywhere); deleting it
  improved coverage for free.
- `extractToolResultText` L53 `return null` is a TypeScript exhaustiveness guard unreachable at
  runtime — a permanent 1-line gap, acceptable to leave uncovered.
- To diagnose coverage gaps on parser exports: run `ts_get_references` first. Zero external
  callers = dead code (delete it); production callers with no test references = add test cases.

## Do

- Pass JSONL string fixtures directly to pure parser functions — no DI setup required
- Run `ts_get_references` on every exported parser symbol before writing new tests
- Delete exported functions with zero external callers; they inflate the coverage denominator

## Don't

- Don't reach for `setupContainer` or service stubs when the target function takes only
  primitive inputs
- Don't treat an exhaustiveness-guard `return null` as a coverage obligation

---

**Keywords:** pure function, parser, JSONL, integration test, setupContainer, ts_get_references,
dead code, coverage, computeMessagesTotalFromContent, scanStats, extractToolResultText,
exhaustiveness guard

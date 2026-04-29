# ClaudeCodeParser: Incomplete Fixtures Leave Tool Branches Uncovered

**Type:** Discovery

## Context

`claudeCodeParser` handles multiple event types: assistant text, tool_use, tool_result, and
result. If the test fixture helper generates only one event type, the other branches go entirely
unexercised, producing misleadingly low integration coverage numbers.

## What happened / What is true

- `makeResultLines` generated only `assistant(text)` + `result` events. As a result:
  - `processAssistantEvent` tool_use branch was never reached
  - `processUserEvent` (tool_result handling) was never reached
  - `emitStreamEvents` was unreachable (requires an `onStreamEvent` callback that no
    integration test passed)
- `parseStreamEvents` was an exported convenience wrapper with zero production callers — used
  only in unit tests. Its presence inflated the uncovered line count. Removing it and inlining
  into the test file immediately reduced the denominator and improved apparent coverage.

## Do

- Provide fixture helper variants for every event type the parser handles (tool_use, tool_result,
  permission, stream events, etc.)
- Run `ts_get_references` on exported symbols before attributing coverage gaps to hard-to-reach
  branches — the gap may be dead code
- Delete exported helpers with no production callers and inline them into test files

## Don't

- Don't rely on a single fixture helper to cover a multi-branch parser
- Don't keep exported wrappers that have no production callers — they inflate the coverage
  denominator

---

**Keywords:** claudeCodeParser, makeResultLines, coverage gap, tool_use, tool_result,
emitStreamEvents, dead code, integration test, fixture helper, parseStreamEvents, denominator

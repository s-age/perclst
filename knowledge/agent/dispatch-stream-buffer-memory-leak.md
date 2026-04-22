# dispatch() Stream Buffer Memory Leak

**Type:** Problem

## Context

`agentRepository.ts` contains a `dispatch` method that runs `claude -p --stream-json` and
processes its output. This applies whenever a task performs many tool calls, causing the
streamed JSONL output to become very large.

## What happened / What is true

- `dispatch` accumulated every stdout line into a `lines: string[]` array.
- `parseStreamEvents(lines, baseline)` required the full array, so lines could not be
  released until the stream ended.
- Tasks with heavy tool use (tool_use + tool_result events per call) could buffer hundreds
  of megabytes before the stream closed.

**Fix — incremental parsing via three new functions in `claudeCodeParser.ts`:**

- `createParseState()` — creates the initial mutable parse state.
- `processLine(state, line)` — processes one JSONL line in place; called per line so each
  line becomes GC-eligible immediately after.
- `finalizeParseState(state, baseline)` — produces the final `RawOutput` once the stream ends.

`parseStreamEvents` was kept as a wrapper over these three functions so existing tests
continued to pass unchanged.

Inside `dispatch`, the pattern changed from:

```ts
lines.push(line);
// ... later: parseStreamEvents(lines, baseline)
```

to:

```ts
processLine(state, line);   // line is GC-eligible after this call
// ... later: finalizeParseState(state, baseline)
```

## Do

- Use incremental (`processLine`) parsing whenever the source is a long-running stream.
- Keep `parseStreamEvents` as a compatibility shim so existing tests require no changes.
- Release parsed lines immediately — don't accumulate them.

## Don't

- Don't collect all stream lines into an array before parsing when the stream may be large.
- Don't assume "collect then parse" is safe for streams with many tool calls.

---

**Keywords:** dispatch, memory leak, buffer, stream, lines array, incremental parsing, agentRepository, claudeCodeParser, processLine, GC, tool_use, tool_result

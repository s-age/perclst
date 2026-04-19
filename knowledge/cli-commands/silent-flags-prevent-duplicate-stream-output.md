# Silent Flags Prevent Duplicate Output When Streaming Is Active

**Type:** Discovery

## Context

When real-time streaming is enabled, events (thoughts, tool responses) are already printed as
they arrive via `onStreamEvent`. The final `printResponse` call at the end of a run would then
print the same content again from the accumulated `RawOutput`, causing duplicates.

## What happened / What is true

- `printResponse` accepts `silentThoughts` and `silentToolResponse` flags.
- When streaming is active (`!outputOnly && format !== 'json'`), passing
  `silentThoughts: true, silentToolResponse: true` to `printResponse` suppresses the
  batch-printed thoughts and tool calls, leaving only the final assistant text.
- The JSON format and `--output-only` paths do not stream in real time, so they must not
  set these flags — they rely on `printResponse` for all output.

## Do

- Gate `silentThoughts`/`silentToolResponse` on `!outputOnly && format !== 'json'` (i.e., only
  when streaming is actually active and producing visible output).
- Keep `printResponse` as the single source of truth for non-streaming paths.

## Don't

- Don't set the silent flags unconditionally — JSON and output-only callers will lose content.
- Don't try to deduplicate by skipping `printResponse` entirely; it may still need to emit
  the final assistant response text.

---

**Keywords:** printResponse, silentThoughts, silentToolResponse, streaming, duplicate output, outputOnly, format

# Streaming Design: Callback over Async Generator

**Type:** Discovery

## Context

`ClaudeCodeInfra.runClaude` is an async generator that streams output line by line.
`ClaudeCodeRepository.dispatch` originally collected all lines into an array before calling
`parseStreamEvents`, so thoughts and tool-use events were invisible until the agent fully completed.
A decision was needed on how to surface events in real time without rewriting all layers.

## What happened / What is true

- Changing `dispatch` to an async generator would have altered its return type and forced
  rewrites across every layer that calls it.
- Instead, an optional `onStreamEvent?: (event: AgentStreamEvent) => void` callback was added
  to `dispatch` (and propagated via `ExecuteOptions` and `AgentRunOptions`).
- The return type of `dispatch` (`RawOutput`) is unchanged; existing batch-processing paths
  continue to work.
- The callback fires once per parsed stream event during the run, enabling real-time display.

## Do

- Use an optional callback parameter when you need side-effects (real-time display) without
  changing a function's return type.
- Thread the callback through `ExecuteOptions` → `AgentRunOptions` → `dispatch` so callers
  at any layer can opt in.

## Don't

- Don't change `dispatch` to an async generator just to enable streaming; the return-type
  change cascades through too many call sites.
- Don't couple real-time display logic inside `dispatch` itself — keep it in the callback.

---

**Keywords:** streaming, onStreamEvent, callback, async generator, dispatch, real-time, AgentStreamEvent

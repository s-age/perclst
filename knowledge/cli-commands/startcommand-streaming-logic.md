# startCommand Streaming Behavior

**Type:** Discovery

## Context

When writing or testing the `startCommand` function, you need to understand when real-time event streaming is enabled. The streaming flag is computed from two independent conditions, and this affects assertions about what parameters are passed to `agentService.start()`.

## What happened / What is true

The `startCommand` determines whether streaming is enabled using an AND condition on two disable flags:

```ts
const streaming = !input.outputOnly && input.format !== 'json'
const onStreamEvent = streaming
  ? (event: AgentStreamEvent) => printStreamEvent(event, config.display)
  : undefined
```

This produces three cases:
- `outputOnly=true` (any format) → streaming disabled → `onStreamEvent: undefined`
- `outputOnly=false` + `format='json'` → streaming disabled → `onStreamEvent: undefined`
- `outputOnly=false` + `format != 'json'` (e.g., `text`, `markdown`) → streaming enabled → `onStreamEvent: [Function]`

The stream callback is always either a function reference or undefined—never null or any other falsy value.

## Do

- Set `outputOnly: true` in tests when you expect `onStreamEvent` to be `undefined`
- Set `format: 'json'` in tests to disable streaming without suppressing output
- Remember streaming is a computed boolean with an implicit AND on both disable conditions

## Don't

- Assume `onStreamEvent` is undefined just because you didn't explicitly enable streaming—check your options
- Change the streaming logic without considering impact on tests and consumers

---

**Keywords:** streaming, startCommand, onStreamEvent, format, outputOnly, test-assertion

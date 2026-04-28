# V8 Coverage: Arrow Function Body in Ternary Requires Invocation

**Type:** Problem

## Context

When a ternary expression assigns an arrow function in its truthy branch, V8/Istanbul coverage requires the function *body* to be executed — not merely the ternary being evaluated to the truthy branch.

## What happened / What is true

In `run.ts`:

```ts
const onStreamEvent = streaming
  ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)  // ← reported uncovered
  : undefined
```

A test with `streaming = true` existed, but the arrow function body (`printStreamEvent(...)`) was never actually called, so V8/Istanbul reported the line as uncovered.

- Evaluating the ternary to its truthy branch defines the function but does not execute its body
- Coverage tools track function-body execution, not merely function definition
- Fix: make the service stub invoke the received callback during the test run

## Do

- Have the stub that receives `options.onStreamEvent` actually call it:
  ```ts
  run: vi.fn(async function* (_pipeline, options) {
    options.onStreamEvent?.({ type: 'thought', thinking: 'streaming...' })
    yield* []
  })
  ```

## Don't

- Don't assume a ternary being evaluated to truthy is sufficient to cover an inline arrow function body
- Don't rely solely on setting `streaming = true` in test input — the stub must also invoke the callback

---

**Keywords:** V8, Istanbul, coverage, arrow function, ternary, inline function, onStreamEvent, run.ts, vitest, uncovered

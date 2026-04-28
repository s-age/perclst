# V8 Async Continuation Keeps All Pre-Await Locals Alive

**Type:** External

## Context

A large variable allocated before a `for await` loop in an `async` function will remain
on the heap for the entire duration of the loop — even if the code that uses it has
already finished.

## What is true

V8 compiles async functions as state machine continuations. Every local variable declared
before the first `await` / `for await` is captured in the continuation object and kept
reachable until the async frame resolves. The GC cannot collect them.

```typescript
// ❌ jsonlContent stays live for the entire for-await loop (may run for minutes)
async function dispatch() {
  const jsonlContent = readFile(path)   // may be hundreds of MB
  for await (const line of runClaude()) {
    // jsonlContent is never used here, but V8 keeps it alive
  }
}

// ✅ jsonlContent is freed when readBaselines() returns
private readBaselines(path: string) {
  const jsonlContent = readFile(path)
  return computeStats(jsonlContent)     // only scalars returned
}
async function dispatch() {
  const stats = this.readBaselines(path)  // large allocation freed before loop
  for await (const line of runClaude()) { ... }
}
```

## Do

- Extract heavy reads into a separate synchronous method. Return only the small derived
  values; the large allocation is freed when the helper returns.

## Don't

- Allocate large arrays or strings inside an `async` function that also contains a
  long-running `for await` loop.

---

**Keywords:** V8, async continuation, for await, memory leak, locals, GC, heap, state machine, async scope

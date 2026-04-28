# process.once('SIGINT') Listener Leaks After Normal Exit

**Type:** Problem

## Context

When registering a SIGINT handler with `process.once('SIGINT', handler)` inside a CLI command,
the listener is only removed automatically if SIGINT actually fires. If the command exits normally
or throws an exception, the listener persists — accumulating across repeated calls (e.g., in tests)
and triggering `MaxListenersExceededWarning`.

## What happened / What is true

- `process.once` only auto-removes the listener when the named event fires
- On normal or exception exit, the listener remains attached to the process
- Each test run that calls the command without triggering SIGINT adds another listener
- Node.js emits `MaxListenersExceededWarning` after 10+ listeners on the same event

## Do

- Always remove the listener in a `finally` block:

```ts
const onSigint = (): void => abortService.abort()
process.once('SIGINT', onSigint)
try {
  // ... work ...
} finally {
  process.removeListener('SIGINT', onSigint)
}
```

## Don't

- Don't rely on `process.once` to clean itself up when the command exits normally
- Don't register SIGINT handlers without a paired cleanup path in `finally`

---

**Keywords:** process.once, SIGINT, listener leak, MaxListenersExceededWarning, removeListener, Node.js, event emitter, cleanup

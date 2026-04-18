# AsyncGenerator + child_process: Exit Code Timing

**Type:** Problem

## Context

Applies when converting a `claude -p` runner from `Promise<RawOutput>` to an
`AsyncGenerator<string>` that yields stdout lines incrementally. The child
process's `close` event races with the end of the `for await…of` loop over
`child.stdout`.

## What happened / What is true

After `for await…of child.stdout` completes, the `close` event may not have
fired yet. If the exit code is stored via:

```ts
child.on('close', (code) => { exitCode = code })
```

…then `exitCode` can still be `null` immediately after the loop ends, making
error detection unreliable. `child.exitCode` (synchronous property) has the
same race and is equally unreliable at that moment.

**Fix — the `closePromise` pattern:**

```ts
const closePromise = new Promise<number | null>((res) => {
  child.on('close', (code) => res(code))
})

// yield stdout lines…

throwIfExitError(await closePromise, stderr)
```

Register the `close` listener **before** the generator loop starts. After the
loop (or in a `finally` block), `await closePromise` — by that point the
process has closed and the exit code is guaranteed to be present.

## Do

- Create `closePromise` before entering the `for await…of` loop
- `await closePromise` after stdout is exhausted to read the exit code

## Don't

- Don't read `child.exitCode` synchronously after the loop — it may still be `null`
- Don't store exit code in a closure variable set by the `close` listener and
  read it before awaiting that event

---

**Keywords:** AsyncGenerator, child_process, exit code, close event, streaming, closePromise, race condition, runClaude

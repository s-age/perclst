# Testing useState Functional Updaters in Hook Unit Tests

**Type:** Discovery

## Context

When a React hook calls `setState` with a functional updater — `setFoo((prev) => ...)` —
Vitest mocks capture the updater function itself, not a resolved value. Asserting `.toHaveBeenCalledWith(someValue)` will not work; the mock receives a function.

## What is true

The mock's `calls[0][0]` holds the updater function. Call it manually with a representative
`prev` value and compare the return value against the expected pure-function output.

```ts
capturedHandler()('', makeKey({ upArrow: true }))
const updater = vi.mocked(mockSetScrollOffset).mock.calls[0][0] as (prev: number) => number
expect(updater(2)).toBe(computeNextScrollOffset('up', 2, totalLines, capacity))
```

This works because the updater is a pure transformation: given a `prev`, it returns the
next state deterministically.

## Do

- Extract the updater from `mock.calls[0][0]` and cast it to the appropriate function type
- Call the updater with a representative `prev` value
- Compare the result against the corresponding pure helper function directly

## Don't

- Don't assert `toHaveBeenCalledWith(someValue)` for functional updaters — the mock
  captures a function, not the computed value
- Don't skip testing the updater logic on the assumption that setState is "just called"

---

**Keywords:** useState, functional updater, setState, mock, Vitest, hook testing, prev, unit test

# Testing React Hooks That Are Thin Wrappers Around External APIs

**Type:** External

## Context

Applies when a custom React hook's sole responsibility is to call an external
API (e.g. `useAbort` wrapping `ink`'s `useInput`). The standard approach of
`renderHook` + `act` adds unnecessary complexity for hooks with no internal
state or effects.

## What happened / What is true

For a thin-wrapper hook:

1. Mock the external module at the module level with `vi.mock('module-name')`.
2. Extract the captured arguments from the mock's call history:
   `mockFn.mock.calls[0][0]` gives the first argument passed on the first call.
3. Call those extracted functions manually to exercise the hook's logic.
4. Assert against the hook's callbacks (e.g. `onAbort` was called).

No React render context (`renderHook`, `act`) is needed when the hook has no
state or effects — the mock intercepts the external call and returns control
immediately.

**Example:** `useAbort` only calls `useInput(handler, options)`. Mock `useInput`,
extract the handler from `mock.calls[0][0]`, invoke it with test inputs, and
verify `onAbort` was called.

## Do

- Use `vi.mock` + call-history extraction for hooks that purely delegate to an
  external API.
- Skip `renderHook`/`act` when the hook has no React state or effects.

## Don't

- Don't reach for `renderHook` reflexively for every hook test — assess whether
  the hook actually needs a React render environment.
- Don't test the external API's behavior; only test what the wrapper does with
  the arguments it receives.

---

**Keywords:** vitest, vi.mock, hook testing, thin wrapper, useInput, ink, renderHook, act, mock.calls, useAbort

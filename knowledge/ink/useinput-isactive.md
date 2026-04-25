# ink useInput: Disable a Handler Selectively with `isActive`

**Type:** External

## Context

When multiple `useInput` hooks coexist in the same component tree (e.g. a scroll
handler and a permission-request handler), you sometimes need to suspend one
handler while keeping the others active.

## What happened / What is true

ink's `useInput` accepts `{ isActive: boolean }` as a second argument. Setting it
to `false` disables only that particular handler — all other `useInput` hooks in
the tree continue to fire normally. stdin itself is not paused; input is merely
not routed to the disabled handler.

```ts
// Disable scroll input while a permission prompt is open
useInput(scrollHandler, { isActive: !permRequest })

// Permission handler stays active regardless
useInput(permHandler)
```

This is the idiomatic ink pattern: it signals intent more clearly than a guard
clause inside the handler body.

## Do

- Pass `{ isActive: boolean }` as the second argument to `useInput` to toggle a
  handler on/off dynamically.
- Use `isActive` when two handlers share a component and one must be silenced
  under a specific condition.

## Don't

- Don't substitute `if (!condition) return` inside the handler — it works but
  obscures the enable/disable intent and is not idiomatic ink.
- Don't assume `isActive: false` pauses stdin; other `useInput` hooks still
  receive keystrokes.

---

**Keywords:** ink, useInput, isActive, input handler, disable, multiple hooks, TUI, keypress

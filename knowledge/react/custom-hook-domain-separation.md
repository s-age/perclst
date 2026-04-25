# Custom Hook Domain Separation (useAbort vs useScrollBuffer)

**Type:** Discovery

## Context

In the `PipelineRunner` component, keyboard input handlers were initially co-located in
`useScrollBuffer`. When adding Ctrl+Q (abort) handling, it was placed in the same hook —
but this mixes two unrelated domains in a single adapter.

## What happened / What is true

Custom hooks are treated as **lifecycle-and-state adapters** for a single domain.
Mixing domains in one hook violates single-responsibility:

- `useScrollBuffer` = display domain adapter (scroll state sync)
- `useAbort` = execution lifecycle adapter (abort signal sync)

These two are orthogonal; bundling them means one hook owns two domains.

Ink's `useInput` supports **multiple registrations**, so splitting hooks has zero runtime cost —
each hook independently registers its own `useInput` listener.

## Do

- Ask "which domain does this key belong to?" before adding a handler to an existing hook
- Create a new hook for each distinct domain (display, execution lifecycle, navigation, etc.)
- Register multiple `useInput` calls freely — Ink supports it with no conflicts

## Don't

- Don't add key handlers to an existing hook just because it already uses `useInput`
- Don't bundle unrelated key bindings (e.g. scroll + abort) in one hook
- Don't conflate "same component" with "same domain" — a component can span multiple domains

---

**Keywords:** useAbort, useScrollBuffer, useInput, custom hook, domain separation, lifecycle adapter, PipelineRunner, Ink, single responsibility

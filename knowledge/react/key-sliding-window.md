# React Keys on a Sliding-Window Slice Must Use an Absolute Index

**Type:** Problem

## Context

When rendering a sliding window — a slice of a growing array — using the slice-local
index `i` as a React key causes stale element reuse as the window shifts. This affects
any component that renders a subset of a list that grows or scrolls over time.

## What happened / What is true

- `OutputPanel` used `key={i}` on `visibleLines`, which is a slice of `allLines`
- As new lines arrive and the window advances, index `0` of the slice points to a
  different line than before
- React matches the existing element at key `0` and skips re-rendering it, leaving
  the display frozen or showing stale content

## Do

- Key on the absolute position in the source array: `key={lineOffset + i}`
- This ensures every unique source line retains its own React element even as the
  window shifts

## Don't

- Don't use the slice-local index as a React key when the slice can shift
- Don't assume that changing `children` content forces React to create a new element
  if the key is the same as before

---

**Keywords:** react, key, sliding window, slice, absolute index, lineOffset, reuse, reconciliation, stale, output panel

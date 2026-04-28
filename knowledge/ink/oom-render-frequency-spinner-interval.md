# Ink OOM: High Render Frequency Exhausts GC at Scale

**Type:** Problem

## Context

Long pipeline runs (80+ tasks, ~36 min) crashed with
`FATAL ERROR: Ineffective mark-compacts near heap limit` at ~4 GB.
Stack trace: `Builtins_ArrayPrototypeReverse` inside Ink's render path
(`output.js` → `styledCharsFromTokens` → `reduceAnsiCodes().reverse()`).

The `.reverse()` site is **not the cause** — it is just where the GC interrupt fired
because the heap was already full during a normal render cycle.

## Root cause

`Output.get()` in Ink creates a `width × height` 2D array of `{type, value, styles}` cell
objects on every render, plus `StyledChar[]` arrays via `@alcalzone/ansi-tokenize` for
every visible line. For a ~200×50 terminal: ~10 000 cells per render.

With `SPINNER_INTERVAL_MS = 80` (12.5 renders/s) and 80 tasks:
- ~125 000 short-lived cell objects allocated per second.
- Young-gen GC cannot keep up; old-gen fills over a 36-minute run.

## Fix

Raise `SPINNER_INTERVAL_MS` from `80` to `300` ms → ~3.3 renders/s (4× reduction in
allocation rate). No visible UX regression at this frequency.

## Do

- Set `SPINNER_INTERVAL_MS ≥ 300` for pipelines expected to run for more than a few minutes.
- Diagnose Ink OOM via `Builtins_ArrayPrototypeReverse` in the stack — look one frame up
  for the actual render cycle entry point.

## Don't

- Assume a `reverse()` crash site is the root cause — it is a symptom of GC pressure.

---

**Keywords:** Ink, OOM, render frequency, SPINNER_INTERVAL_MS, Output.get, GC pressure, ansi-tokenize, heap

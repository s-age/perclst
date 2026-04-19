# Ink TUI: Fixed Root Height Prevents Scroll Drift

**Type:** Problem

## Context

When building a full-screen TUI with Ink, the root `<Box>` must be given an
explicit `height` equal to the terminal's row count. Without it, each re-render
leaves ghost lines from the previous frame, causing headers and other elements
to repeat visually and scroll drift to accumulate.

## What happened / What is true

Ink erases the previous frame by rewinding the cursor by exactly the number of
lines it printed last time, then overwriting them. When the root container has
no fixed height, line counts vary between renders, so the rewind is wrong and
stale content bleeds through.

Fixing this requires reading the real terminal height with `useStdout()` and
applying it to the root `<Box>`:

```tsx
import { useStdout } from 'ink'

const { stdout } = useStdout()
const termRows = stdout.rows ?? 24

return <Box flexDirection="row" height={termRows}>...</Box>
```

With `height={termRows}` set, Ink always erases exactly `termRows` lines on
each cycle and scroll drift stops entirely.

A related pattern: cap any streaming content buffer at `termRows` as well, so
the right panel never overflows the terminal regardless of terminal size:

```ts
const streamCapacity = Math.max(1, termRows - STREAM_HEADER_ROWS)
```

## Do

- Set `height={termRows}` on the outermost `<Box>` of any full-screen Ink UI.
- Derive `termRows` from `useStdout().stdout.rows` (with a fallback of `24`).
- Base dynamic buffer/list caps on `termRows` so layout adjusts to any terminal.

## Don't

- Don't leave the root `<Box>` without an explicit `height` — variable height
  causes cursor-rewind miscalculation and ghost lines.
- Don't hard-code a row count; use `stdout.rows` so the UI adapts when the
  terminal is resized.

---

**Keywords:** ink, tui, scroll drift, ghost lines, fixed height, useStdout, termRows, re-render, cursor rewind, full-screen, buffer cap

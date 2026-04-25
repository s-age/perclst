# TUI Scroll: Freeze Display with a Snapshot on Scroll Entry

**Type:** Discovery

## Context

TUI components that render a live-streaming line buffer (e.g. agent output) and
also support scroll-back mode. Without isolation between the live buffer and the
displayed buffer, new lines arriving during scroll shift the viewport unexpectedly.

## What happened / What is true

The solution is a **frozen snapshot** pattern:

1. On scroll entry — copy `allLines` into `frozenLines` and set `scrollMode = true`.
2. During scroll — render from `frozenLines`; `allLines` continues to accumulate in
   the background (capped at `MAX_ALL_LINES = 5000`).
3. On scroll exit — clear `frozenLines`, revert display to the live tail of `allLines`.

```ts
// Entry: take snapshot
setFrozenLines([...allLines])
setScrollMode(true)

// Render: switch on mode
const displayLines = scrollMode ? frozenLines : allLines

// View window (scrollOffset = lines above tail)
const viewEnd   = Math.max(0, displayLines.length - scrollOffset)
const viewStart = Math.max(0, viewEnd - viewportHeight)
const visible   = displayLines.slice(viewStart, viewEnd)
```

`scrollOffset` represents "how many lines above the tail." The `Math.max(0, ...)`
guard on `viewEnd` is **required** — if `scrollOffset` exceeds `displayLines.length`,
`viewEnd` would go negative and `.slice()` would return an empty array, blanking
the display.

## Do

- Snapshot `allLines` into `frozenLines` at the moment scroll mode is entered.
- Switch the display source (`displayLines`) based on `scrollMode`.
- Always guard `viewEnd` with `Math.max(0, displayLines.length - scrollOffset)`.
- Continue accumulating `allLines` while in scroll mode.

## Don't

- Don't skip the `Math.max(0, ...)` guard — a large `scrollOffset` will blank the
  viewport silently.
- Don't stop accumulating `allLines` during scroll; freeze only the *display*
  snapshot, not the incoming data.
- Don't re-render from `allLines` while `scrollMode` is true — the viewport will
  jump as new lines arrive.

---

**Keywords:** TUI, scroll, frozen snapshot, scrollOffset, viewEnd, allLines, frozenLines, ink, line buffer, viewport

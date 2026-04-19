# Ink TUI: Conditional Content Must Emit Constant Line Count

**Type:** Problem

## Context

When a `<Box>` panel in an Ink TUI switches between different content branches
(e.g. idle vs. active state), the total lines rendered by each branch must be
identical. If one branch emits fewer lines, the panel shrinks to fit, causing
layout shifts across the whole screen.

## What happened / What is true

Ink's `height` prop sets the *allocated* height of a box, but it does not pad
the interior — if the child elements produce fewer lines than `height` specifies,
the box collapses to the actual child count. Conditional rendering that outputs
different numbers of lines therefore makes the panel height unstable.

The fix is to pad every branch to the same line count using blank `<Text>` nodes:

```tsx
{permRequest ? (
  <>
    <Text>line 1</Text>
    <Text>line 2</Text>
    <Text>line 3</Text>
    <Text>line 4</Text>
  </>
) : (
  <>
    <Text color="gray">  —</Text>
    <Text> </Text>  {/* padding line */}
    <Text> </Text>
    <Text> </Text>
  </>
)}
```

Both branches emit exactly 4 lines, so the panel height is stable regardless of
which branch is active.

## Do

- Count the lines emitted by every conditional branch and ensure they match.
- Use `<Text> </Text>` (a single space) as a padding line — an empty string may
  collapse to zero height.
- Combine this with a fixed root height (see `fixed-height-prevents-scroll-drift.md`)
  for fully stable full-screen layouts.

## Don't

- Don't rely on `height={N}` alone to stabilise a panel — Ink shrinks the box
  to its actual content lines.
- Don't add or remove content lines dynamically without ensuring all branches
  still have the same count.

---

**Keywords:** ink, tui, fixed height, conditional render, panel height, layout shift, padding lines, constant line count, box collapse

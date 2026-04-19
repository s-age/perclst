# Ink 7: Percentage-Based Split Layout

**Type:** External

## Context

When building a two-column layout in Ink 7 (e.g., a left task list and a right
detail panel), you want the columns to fill the full terminal width proportionally
rather than using fixed character counts.

## What happened / What is true

Ink 7 supports percentage strings for the `width` prop on `<Box>`. The values
are resolved against the terminal width reported by `process.stdout.columns`.

```tsx
<Box flexDirection="row">
  <Box width="40%">Left panel</Box>
  <Box width="60%">Right panel</Box>
</Box>
```

- Percentages must sum to ≤ 100% or overflow will occur.
- `process.stdout.isTTY` must be `true` for terminal-width resolution to work
  correctly; this is always the case when Ink is actually rendering in a terminal.
- If the columns include a border-based divider, account for the 1-character
  border width in your percentage split to avoid wrapping.

## Do

- Use `width="N%"` on child `<Box>` elements inside a `flexDirection="row"` container.
- Validate `process.stdout.isTTY` before launching the Ink UI if your code can
  also run in non-TTY pipelines.

## Don't

- Don't hard-code fixed widths — they break on narrow or wide terminals.
- Don't assume percentages work the same as CSS flex: Ink uses Yoga layout,
  which may handle edge cases differently.

---

**Keywords:** ink, ink7, width, percentage, flex, layout, split panel, columns, terminal width, Yoga

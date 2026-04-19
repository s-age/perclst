# Ink 7: Vertical Divider Using Selective Borders

**Type:** External

## Context

When building a split-panel TUI layout with Ink 7, you need a visual vertical
separator between panels. Ink 7 supports per-edge border control, which enables
a clean single-line divider without drawing a full box border.

## What happened / What is true

Ink 7 allows individual border edges to be enabled or disabled on a `<Box>`.
Setting `borderStyle` plus toggling individual edges lets you draw only a left
border, effectively acting as a vertical divider between two panels.

```tsx
<Box
  borderStyle="single"
  borderTop={false}
  borderBottom={false}
  borderRight={false}
  paddingLeft={1}
>
  {/* right panel content */}
</Box>
```

- `borderStyle` must be set; otherwise edge flags are ignored.
- `borderLeft` is `true` by default when `borderStyle` is set, so it need not be explicit.
- Apply this to the **right** panel; the left panel needs no border.

## Do

- Set `borderStyle="single"` (or another style) and selectively disable the three other edges.
- Add `paddingLeft={1}` so content doesn't touch the divider line.

## Don't

- Don't render a separate `<Text>` column filled with `│` characters — the border approach handles resizing automatically.
- Don't omit `borderStyle` and try to use edge flags alone — they have no effect without it.

---

**Keywords:** ink, ink7, border, borderLeft, divider, vertical separator, split panel, TUI, box

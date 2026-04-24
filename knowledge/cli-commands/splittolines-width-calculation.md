# splitToLines Width Calculation

**Type:** Discovery

## Context

The `splitToLines(text, width, prefix)` utility function is used in PipelineRunner to format text output for display. When writing tests or using this function, it's crucial to understand that the prefix is added *after* width-based splitting, not included in the width calculation.

## What happened / What is true

- Text is split into chunks of exactly `width` characters
- Prefix is then prepended to each chunk
- Empty text returns `[prefix]` (not an empty array)
- Example: `splitToLines('abcdefghij', 5, '  ')` returns `['  abcde', '  fghij']`
  - Each chunk from the text is 5 chars
  - Prefix `'  '` is added to each, making lines 7 chars total
  - The width parameter does **not** account for prefix length

## Do

- Account for prefix separately when calculating expected line lengths
- Remember that total line length = width + prefix length
- Use direct tests (not just indirect tests) for this function to catch width misunderstandings

## Don't

- Assume the prefix is included in the width parameter
- Use substring matching (`.toContain()`) in assertions—use exact matching (`.toBe()`)
- Forget to test empty string case (should return `[prefix]`, not `[]`)

---

**Keywords:** text-formatting, width-calculation, line-splitting, display-utilities

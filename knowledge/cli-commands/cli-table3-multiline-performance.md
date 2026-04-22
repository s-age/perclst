# cli-table3 Slow Rendering with Multi-line Cell Content

**Type:** External

## Context

`cli-table3` is used in `perclst show` to display session turns in tabular form.
Tool results in those turns often contain multi-line file contents (markdown,
TypeScript source, etc.) with many newlines. Inserting this content unsanitised
causes severe rendering slowdowns.

## What happened / What is true

`cli-table3` splits each cell on `\n`, computes the maximum height across all cells
in a row, then renders each sub-row by calling `string-width` for alignment. For a
cell with 100+ lines this produces O(rows × lines) `string-width` calls — visibly
slow. A 5229-char file with ~100 newlines caused the table to take several seconds
to render.

The slowdown does **not** occur when `--length` truncation is active because
`truncate()` internally calls `.replace(/\n/g, ' ')` before the content reaches
the table renderer.

## Do

- Escape newlines before inserting multi-line content into a cli-table3 cell:
  ```typescript
  ansis.strip(row.content).replace(/\n/g, '\\n')
  ```
- Use `--length` to truncate content and constrain column width when compact output
  is needed

## Don't

- Don't insert raw multi-line strings (containing actual `\n` characters) directly
  into cli-table3 cells — the library is not optimised for tall cells
- Don't rely on cli-table3 to handle high-line-count content efficiently at scale

---

**Keywords:** cli-table3, multiline, newline, performance, string-width, slow rendering, table, truncate, perclst show

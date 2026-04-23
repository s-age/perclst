# Format Branch Must Precede Empty-Guard in CLI Commands

**Type:** Problem

## Context

Any CLI command that supports multiple output formats (e.g. `--format json`) and also
has an early-return guard for the empty-result case. The ordering of these two branches
determines whether machine consumers receive valid output or a broken human-readable string.

## What happened / What is true

When the empty-guard fires first, it unconditionally prints a human-readable message
(e.g. `"No sessions found"`) and returns — even when the caller requested JSON.
Machine consumers (scripts, `jq` pipelines, other agents) receive an invalid string
instead of a valid JSON document, causing parse failures.

Affected command: `src/cli/commands/summarize.ts` — fixed in commit 5c4a897.

## Do

- Evaluate the format branch **first**, before any early-return guard
- Emit the appropriate empty value for the format (e.g. `[]` for JSON) so parsers never
  receive an unexpected string
- Keep the human-readable empty-state message in the fallthrough path only

```ts
// Correct order
if (input.format === 'json') {
  stdout.print(JSON.stringify(rows, null, 2)) // emits [] when rows is empty
  return
}
if (rows.length === 0) {
  stdout.print('No sessions found')
  return
}
```

## Don't

- Place the empty-guard before the format branch
- Assume human-readable guards are safe early exits — they silently break JSON consumers

```ts
// Wrong order — "No sessions found" fires even for --format json
if (rows.length === 0) {
  stdout.print('No sessions found')
  return
}
if (input.format === 'json') { ... }
```

---

**Keywords:** format, json, empty-guard, early-return, CLI, output, jq, pipeline, machine-readable, summarize

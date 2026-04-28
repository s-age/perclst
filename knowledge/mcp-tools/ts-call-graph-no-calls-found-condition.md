# ts_call_graph Returns "(no calls found)" Only When No Exported Functions Exist

**Type:** Discovery

## Context

When writing integration test fixtures for `executeTsCallGraph`, the output string
`'(no calls found)'` has a specific trigger. Misunderstanding it leads to incorrect fixture files.

## What is true

The output is `'(no calls found)'` **only** when `result.nodes.length === 0`, which occurs when
the file contains **no exported functions at all**.

A file with exported functions that make no calls still produces output listing those function
names — it does NOT return `'(no calls found)'`.

Examples:
- `export function pure() { return 42 }` → outputs `<path>::pure` (`nodes.length = 1`)
- `const value = 42` (no exports) → outputs `'(no calls found)'` (`nodes.length = 0`)

**Tree format** uses `├──` and `└──` connectors for parent-child call relationships. To assert a
call edge in a test:

```ts
expect(output).toMatch(/└── .*::funcB/)
```

## Do

- Use a file with **no exported functions** (e.g., only constants or unexported code) when testing
  the `'(no calls found)'` branch
- Use `├──` / `└──` regex patterns when asserting call edge presence in output

## Don't

- Don't expect `'(no calls found)'` from a file with exported functions that happen to have no
  callees — they still appear in the output

---

**Keywords:** ts_call_graph, no calls found, nodes.length, exported functions, tree format, connector, integration test fixture

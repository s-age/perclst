# tsCallGraph output format and "(no calls found)" condition

When testing `executeTsCallGraph`, the output is `'(no calls found)'` only when **no exported functions exist** in the file. This is determined by `result.nodes.length === 0`.

A fixture with **exported functions that have no callees** will still produce output showing those function names (just without children in the tree), NOT `'(no calls found)'`.

Example:
- `export function pure() { return 42 }` → outputs `<path>::pure` (nodes.length = 1)
- `const value = 42` → outputs `'(no calls found)'` (nodes.length = 0)

The tree format uses `├──` and `└──` connectors to show parent-child call relationships. When asserting call edges, check for the connector prefix, e.g. `/└── .*::funcB/` to verify funcB appears as a child node.

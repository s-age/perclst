# Pure Functions on Domain Types Belong in domains/, Not utils/

**Type:** Discovery

## Context

When writing pure functions (no I/O, no side effects), there is a temptation to place them in `utils/` because they feel "generic." This rule clarifies when that placement violates the layer import rules.

## What happened / What is true

`flattenTurns` and `applyRowFilter` were placed in `src/utils/turns.ts` because they are pure functions. However, both operate on `ClaudeCodeTurn` (a domain type from `@src/types/analysis`), which forced `utils/` to import from `@src/types/` — a layer it must never import from.

The fix was to move them to `src/domains/turns.ts`.

The deciding factor for `utils/` vs `domains/` is **not** "is it pure?" but **"does it know about domain types?"**:

- **`utils/`** — generic, domain-agnostic helpers (date formatting, UUID generation, logging). Zero `@src/` imports allowed.
- **`domains/`** — business logic and transformations over domain types. May import from `@src/types/`.

A pure function that takes `ClaudeCodeTurn[]` and returns `TurnRow[]` is domain logic — it just happens to have no side effects.

The resulting call pattern exposes domain functions to callers via a service method:

```
cli/show.ts → analyzeService.formatTurns(turns, filter)
                └→ domains/turns.ts (flattenTurns, applyRowFilter)
```

This lets `web/` or `mcp/` reuse the same domain logic through their own service calls without duplicating transformations.

## Do

- Place functions that take or return domain types (`@src/types/`) in `domains/`, even if they are pure
- Keep `utils/` free of all `@src/` imports
- Expose domain functions to CLI/MCP/web callers through a service method

## Don't

- Place domain-type-aware functions in `utils/` just because they have no side effects
- Import from `@src/types/` or any other `@src/` path inside `utils/`

---

**Keywords:** utils, domains, pure function, layer rules, import rules, ClaudeCodeTurn, flattenTurns, domain logic, architecture

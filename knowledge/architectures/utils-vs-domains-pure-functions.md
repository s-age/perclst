# Where Pure Functions Belong: utils/ vs domains/

**Type:** Discovery

## Context

When writing pure functions (no I/O, no side effects), there is a temptation to place them in `utils/` because they feel "generic." The deciding factor is not purity — it is whether the function depends on injected runtime dependencies and whether it needs direct unit testing.

## What happened / What is true

The rule breaks into two cases:

**Case 1 — function operates on domain types, no injected deps, needs direct unit testing**  
Move to `utils/`. `utils/` may freely import from `@src/types/*` — `src/types` is a leaf node with no upstream imports, so `utils → types` creates no cycle. This was confirmed when `calcComplexity` and six related helpers were moved from `src/domains/testStrategy.ts` to `src/utils/testStrategyHelpers.ts` to allow direct testing without leaking implementation details into the domain's public surface.

**Case 2 — function operates on domain types AND requires injected dependencies (e.g. a `repo` argument)**  
Keep in `domains/`. Domain classes are the right home for logic that cannot be cleanly separated from its runtime context.

**Still forbidden in utils/**: importing from `domains/`, `services/`, `repositories/`, `infrastructures/`, or `cli/`.

The original heuristic — "does it know about domain types → domains/" — was too broad. A pure function that takes `ClauseCodeTurn[]` is domain-typed but can still live in `utils/` if it has no injected deps and testability benefits from the move.

Decision tree:

```
Has injected deps (repo, service, etc.)?
  Yes → domains/
  No → Does direct unit testing benefit from isolation?
         Yes → utils/ (importing @src/types is fine)
         No  → either is acceptable; prefer domains/ for domain-type-aware transforms
```

Callers reach domain logic through a service method regardless of which layer owns it:

```
cli/show.ts → analyzeService.formatTurns(turns, filter)
               └→ domains/turns.ts  OR  utils/turnsHelpers.ts
```

## Do

- Import from `@src/types/*` freely within `utils/` files
- Move pure helpers with no injected deps to `utils/` when direct testing is needed
- Keep functions that require injected dependencies inside the domain class

## Don't

- Import from `domains/`, `services/`, `repositories/`, `infrastructures/`, or `cli/` inside `utils/`
- Export implementation-detail helpers from domain files just to test them
- Assume "pure function" automatically means `utils/` — check for injected deps first

---

**Keywords:** utils, domains, pure function, layer rules, import rules, types, testability, flattenTurns, calcComplexity, domain logic, architecture, SKILL.md

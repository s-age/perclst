# Domain-internal pure functions belong in utils

**Type:** Discovery

## Context

When a domain class contains pure helper functions that need direct unit testing, there is a choice between exporting them from the domain file or moving them to `utils/`.

## What happened / What is true

Exporting pure helpers from a domain file leaks implementation details into the module's public API. Other layers can then import and depend on those helpers directly, complicating future refactors.

Moving pure functions to `utils/` instead:
- Keeps the domain file's public surface limited to its class(es)
- Allows tests to import the real source without inline reimplementation
- Makes the function available for reuse across layers that are allowed to import `utils`

This pattern was applied when `calcComplexity` and six other helpers were moved from `src/domains/testStrategy.ts` to `src/utils/testStrategyHelpers.ts`.

## Do

- Move pure functions (no side effects, no injected dependencies) from domain files to `utils/` when direct testing is needed

## Don't

- Don't export implementation-detail helpers from domain files just to test them
- Don't move functions that require injected dependencies (e.g. a `repo` argument) — keep those inside the domain class

---

**Keywords:** pure function, utils, domains, export, testing, testStrategyHelpers, calcComplexity

# utils/path.ts Is the Gateway to Node's path Module

**Type:** Discovery

## Context

The architecture restricts direct use of Node built-in modules to the infrastructure
layer. This matters whenever domain, repository, or other non-infrastructure code
needs path utilities like `extname`, `basename`, or `join`.

## What happened / What is true

- Only code under `infrastructures/` may import Node's `path` module directly.
- `utils/path.ts` already re-exports `path` utilities and acts as the approved
  gateway for all other layers.
- To add a new path utility (e.g. `extname`) for use outside infrastructure,
  add it to `utils/path.ts` and import from `@src/utils/path`.

## Do

- Import path utilities (`extname`, `basename`, `join`, etc.) from `@src/utils/path`
  in domain, repository, and other non-infrastructure code.
- Add new path helpers to `utils/path.ts` when a layer needs them.

## Don't

- Don't import `path` from Node directly outside of `infrastructures/`.
- Don't duplicate path logic inline — route it through `utils/path.ts`.

---

**Keywords:** utils/path, Node path module, extname, infrastructure constraint, layer boundary, import restriction, path utilities

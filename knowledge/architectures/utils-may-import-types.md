# utils layer may import from types

**Type:** Discovery

## Context

The architecture skill (SKILL.md) defines unidirectional import rules per layer. The original `utils` row stated "Must NOT import: all `src/` layers", which appeared to prohibit importing from `src/types`.

## What happened / What is true

`src/types` is a leaf node — it imports nothing from any other `src/` layer. Therefore `utils → types` creates no cycle and does not violate the unidirectional constraint. SKILL.md was updated to explicitly permit this import.

The conflict was discovered when moving domain helper functions to `utils/` — the helpers depended on types defined in `@src/types/testStrategy`.

Permitted: `utils → types`  
Still forbidden: `utils → domains`, `utils → services`, `utils → repositories`, `utils → infrastructures`, `utils → cli`

## Do

- Import from `@src/types/*` freely within `utils/` files

## Don't

- Don't import from any other `src/` layer (`domains`, `services`, etc.) inside `utils/`

---

**Keywords:** utils, types, import rules, architecture, SKILL.md, layer, circular dependency

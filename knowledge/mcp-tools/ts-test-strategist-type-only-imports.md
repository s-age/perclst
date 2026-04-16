# ts_test_strategist: Type-Only Imports Must Be Filtered in Two Places

**Type:** Problem

## Context

When `ts_test_strategist` collects `referencedImports` to build `suggested_mocks`, it must
exclude type-only imports because those have no runtime value and should not be mocked.
ts-morph exposes type-only imports in two distinct forms that require separate checks.

## What happened / What is true

ts-morph distinguishes two forms of type-only imports:

- `import type { Foo }` — the entire declaration is type-only → `ImportDeclaration.isTypeOnly()`
- `import { type Foo, Bar }` — per-specifier annotation → `ImportSpecifier.isTypeOnly()`

Filtering only the declaration-level form still allows inline `type` specifiers through into
`referencedImports`, producing false positives in `suggested_mocks`.

## Do

- Check **both** `ImportDeclaration.isTypeOnly()` and `ImportSpecifier.isTypeOnly()` when
  filtering imports for `referencedImports`
- Exclude a specifier if either the parent declaration or the specifier itself is type-only

## Don't

- Don't assume a single `isTypeOnly()` call on the declaration is sufficient
- Don't include type-only specifiers in `suggested_mocks`

---

**Keywords:** ts-morph, type-only imports, ImportDeclaration, ImportSpecifier, suggested_mocks, false positives, ts_test_strategist

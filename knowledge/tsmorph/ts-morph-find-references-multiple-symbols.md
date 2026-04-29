# ts-morph findReferences Returns Multiple ReferencedSymbol Entries

**Type:** External

## Context

When calling `findReferences()` on an exported function in ts-morph, the result is not a
simple flat list of references. This affects any reference-resolution logic that tries to
exclude a function's own declaration from results — for example, in `ts_get_references`.

## What happened / What is true

`findReferences()` on an exported function (e.g., `export function moveFile(...)`) returns
**two** `ReferencedSymbol` entries:

1. **Local function symbol** — definition at the function name (`isDefinition=true`), plus
   references at call sites.
2. **Import alias symbol** — definition in the importing file's import statement; references
   at usage sites in that file (`isDefinition=false` for the original declaration position).

The same source position (the function name identifier) appears in **both** entries: as a
*definition* in entry #1 and as a *regular reference* in entry #2. Filtering only on
`ref.isDefinition() === false` misses the alias entry, so the function's own declaration
leaks into the reference results.

## Do

- In a **first pass**, collect all definition positions (`file:offset` pairs) from entries
  where any reference has `isDefinition() === true`.
- In a **second pass**, filter out any reference whose position matches a collected definition
  position — regardless of its own `isDefinition()` value.

## Don't

- Don't filter references solely by `ref.isDefinition() === false` — the declaration
  position appears as `isDefinition=false` in the import alias entry and will leak through.

---

**Keywords:** ts-morph, findReferences, ReferencedSymbol, isDefinition, import alias, cross-file references, ts_get_references, self-reference

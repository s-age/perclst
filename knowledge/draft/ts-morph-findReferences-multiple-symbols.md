## ts-morph findReferences returns multiple ReferencedSymbol entries

`findReferences()` on an exported function like `export function moveFile(...)` returns **two** `ReferencedSymbol` entries:

1. **Local function symbol** — definition at the function name (isDefinition=true), references at call sites
2. **Import alias symbol** — definition in the importing file's import statement, references at usage sites in that file (isDefinition=false for the original declaration position)

The same source position (the function name identifier) appears in both entries: as a *definition* in entry #1 and as a *regular reference* in entry #2. Filtering only on `ref.isDefinition()` misses the alias entry, so the function's own declaration leaks into the reference results.

**Fix**: collect all definition positions (`file:offset` pairs) from entries where `isDefinition()` is true in a first pass, then filter out any reference matching those positions in the second pass — regardless of its own `isDefinition()` value.

Discovered while debugging self-referential recursion in `ts_get_references` recursive resolver (2026-04-29).

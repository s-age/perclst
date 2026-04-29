# ts_get_references Misses Alias Imports

**Type:** Problem

## Context

`ts_get_references` searches for all call sites of a given symbol. It fails to detect usages
where the importing module renames the symbol with an alias at import time.

## What happened / What is true

When a symbol is imported under an alias — e.g.
`import { parseFunctions as _parseFunctions } from './tsParser'` — querying
`ts_get_references` for `parseFunctions` returns zero external references, even though
production code calls it via `_parseFunctions`. The underlying ts-morph `findReferences`
matches on the canonical declaration name and does not follow aliased bindings.

## Do

- Supplement `ts_get_references` with a `grep -rn '<symbol>'` when results appear suspiciously
  empty
- Treat "zero external references" as a signal to investigate aliasing, not a confirmation of
  dead code
- Check whether callers import the symbol under a different local name before concluding it is
  unused

## Don't

- Don't rely solely on `ts_get_references` to confirm a symbol is dead code
- Don't delete a symbol based on zero `ts_get_references` results without a grep cross-check

---

**Keywords:** ts_get_references, alias import, import rename, dead code, false negative, ts-morph,
findReferences, parseFunctions, blind spot

# Re-exported Symbols Are Not in Local Scope

**Type:** Problem

## Context

Applies whenever a symbol is moved to a new file and re-exported from the original module. Any remaining local code in the original file that references the symbol will fail at runtime, even though TypeScript may not surface an error.

## What happened / What is true

After extracting functions to a new file and re-exporting them from the original:

```typescript
// claudeSessionScanner.ts
export { createStatsScanState, processStatsScanLine, finalizeStatsScan } from './claudeStatsScanParser'
```

A legacy wrapper function inside `claudeSessionScanner.ts` that calls `createStatsScanState()` throws:

```
ReferenceError: createStatsScanState is not defined
```

`export { X } from '...'` is a re-export declaration, **not** an import. The symbol never enters the local module scope — it is only forwarded to consumers.

## Do

- Add a separate import with aliased names for local use alongside the re-export:

```typescript
import {
  createStatsScanState as _createStatsScanState,
  processStatsScanLine as _processStatsScanLine,
  finalizeStatsScan as _finalizeStatsScan
} from './claudeStatsScanParser'
```

- Or update local callers to import directly from the source module.

## Don't

- Don't assume a re-export makes a symbol available to local code in the same file.
- Don't rely on TypeScript's type checker alone — it may not flag this; the error is a runtime `ReferenceError`.

---

**Keywords:** re-export, export from, local scope, ReferenceError, ESM, TypeScript module, barrel, claudeSessionScanner

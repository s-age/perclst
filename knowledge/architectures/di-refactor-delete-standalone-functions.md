# Delete Standalone Functions When Adding Class Methods

**Type:** Problem

## Context

When migrating a repository from module-level standalone functions to class methods with constructor injection, the old standalone functions must be removed — not left in place alongside the class.

## What happened

Leaving standalone functions creates two parallel APIs. Old callers continue to import the function directly and completely bypass DI. The refactor appears to work in tests, but production call sites silently use the old path without injected dependencies.

## How to verify before deleting

```bash
grep -rn "functionName" src --include="*.ts" | grep -v "__tests__|theFileName.ts"
```

Confirm zero non-test callers before deleting. Watch for false positives: domain method names (e.g. `save`, `find`) can match names of standalone repository functions but are different imports.

## Do

- Delete every standalone function that has been replaced by a class method
- Verify zero non-test callers with grep before deleting
- Check for false-positive grep matches caused by common method names

## Don't

- Leave standalone functions alongside the new class implementation
- Assume no callers exist without checking
- Treat test-only callers as "real" callers that block deletion

---

**Keywords:** DI, refactor, standalone functions, class methods, constructor injection, parallel API, dead code

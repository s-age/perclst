# API Consolidation: Recursive Variants

**Type:** Discovery

## Context

When designing service-layer APIs that have similar methods where one is just the recursive variant of the other (e.g., `getReferences` and `getReferencesRecursive`), it's tempting to expose both. However, this pattern creates unnecessary API surface area and forces conditional logic onto callers.

## What happened / What is true

The service layer should consolidate recursive variants into a single method with a `recursive?: boolean` option parameter. This approach:

- Reduces public API surface from two methods to one
- Eliminates conditional branching in callers (tool layer, etc.)
- Makes intent explicit at call sites (the option parameter is self-documenting)
- Keeps internal delegation clean (private domain methods can remain separate)

**Implementation pattern:**
```typescript
// Service layer: public API
getReferences(filePath: string, symbolName: string, options?: { recursive?: boolean }): ReferenceInfo[] | RecursiveReferenceInfo[] {
  if (options?.recursive !== false) {
    return this.domain.getReferencesRecursive(filePath, symbolName, options)
  }
  return this.domain.getReferences(filePath, symbolName, options)
}
```

**Caller simplification:**
```typescript
// Tool layer: single method call, options-driven
const references = service.getReferences(args.file_path, args.symbol_name, {
  includeTest: args.include_test,
  recursive: args.recursive
})
```

## Do

- Consolidate recursive variants in the public service API
- Let internal domain methods remain separate (they're implementation details)
- Use an options parameter to control the variant (more extensible than a flag)
- Make the default behavior explicit with `!== false` (recursive by default unless explicitly disabled)

## Don't

- Expose both `getReferences()` and `getReferencesRecursive()` as public methods
- Force callers to branch on the recursion flag
- Create parallel method documentation that repeats the same signature

---

**Keywords:** api consolidation, recursive methods, variant, service design, method overload, options parameter

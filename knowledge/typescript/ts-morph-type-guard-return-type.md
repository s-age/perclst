# ts-morph: Extracting Type Guards into Helper Functions Loses Narrowing

**Type:** External

## Context

When using ts-morph's type guard methods (e.g. `Node.isReferenceFindable(symbol)`),
TypeScript narrows the checked variable inline. If you extract that guard into a
helper function without an explicit intersection return type, the narrowing is lost
at the call site.

## What is true

- `Node.isReferenceFindable(symbol)` used inline narrows `symbol` to
  `Node & ReferenceFindableNode`, enabling calls like `symbol.findReferences()`.
- Extracting to a helper with return type `Node | undefined` strips the narrowing;
  the caller sees only `Node` and gets a type error on `findReferences()`.
- The fix is to declare the return type explicitly as the intersection:
  `(Node & ReferenceFindableNode) | undefined`.

```typescript
// Correct: preserves narrowing for callers
export function findReferenceFindableSymbol(
  sourceFile: SourceFile,
  symbolName: string
): (Node & ReferenceFindableNode) | undefined {
  const symbol = resolveSymbol(sourceFile, symbolName)
  if (!symbol || !Node.isReferenceFindable(symbol)) return undefined
  return symbol
}
```

- `ReferenceFindableNode` must be imported with `import type` from `ts-morph`.

## Do

- Declare the return type of any extracted type-guard helper as the **intersection
  type** that the guard produces (e.g. `Node & ReferenceFindableNode`).
- Use `import type { ReferenceFindableNode }` to bring in the narrowed interface.

## Don't

- Don't widen the return type to the base type (`Node | undefined`) when the
  purpose of the function is to confirm a more specific type — callers will lose
  the narrowed interface.
- Don't assume TypeScript will infer the intersection automatically from the
  guard body; the explicit annotation is required.

---

**Keywords:** ts-morph, type guard, narrowing, intersection type, ReferenceFindableNode, isReferenceFindable, helper function, TypeScript, refactor

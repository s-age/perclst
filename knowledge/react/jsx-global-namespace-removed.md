# React 19: Global JSX Namespace Removed

**Type:** External

## Context

Projects using `@types/react` v19 that reference the bare `JSX` namespace (e.g. `JSX.Element` as a return type) in `.tsx` files will get a TypeScript error. This was a silent breaking change from v17/v18.

## What happened / What is true

- In `@types/react` v17/v18, the package declared `declare global { namespace JSX { ... } }`, making `JSX.Element` available everywhere without an import.
- In `@types/react` v19 that global declaration was removed. `JSX` now lives only inside `React.JSX`.
- Adding `"react"` to `tsconfig.json` `types` does **not** fix it — the package itself no longer provides the global.
- Error seen: `TS2503: Cannot find namespace 'JSX'`.

## Do

- **Preferred (React 19 canonical):** Replace `JSX.Element` → `React.JSX.Element` in every source file.
- **Quick shim (no source changes):** Add `src/types/jsx.d.ts` with a global re-export:

```typescript
import type React from 'react'

declare global {
  namespace JSX {
    type Element = React.JSX.Element
    type ElementClass = React.JSX.ElementClass
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
    type IntrinsicElements = React.JSX.IntrinsicElements
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes
  }
}
```

`src/types/` is already covered by tsconfig `include`, so no extra config is needed.

## Don't

- Don't rely on `tsconfig.json` `types: ["react"]` to restore the global — it has no effect here.
- Don't use the shim approach in new projects; it is a compatibility band-aid that may accumulate technical debt.

---

**Keywords:** React 19, @types/react, JSX namespace, JSX.Element, TS2503, global namespace, TypeScript, types/react v19

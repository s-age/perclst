# Large React Component Split Pattern

**Type:** Discovery

## Context

Applies when a component under `src/cli/components/` grows large enough to warrant
splitting into smaller pieces. The goal is to divide the file without touching any
existing import paths elsewhere in the codebase.

## What happened / What is true

When splitting a large React component, create a `parts/<ComponentName>/` subdirectory
and move the implementation there. The original `ComponentName.tsx` becomes a single-line
re-export:

```ts
export { MyComponent } from './parts/MyComponent/index.js';
```

This keeps all existing `import { MyComponent } from '...'` paths valid with zero diff
noise across the rest of the codebase.

## Do

- Create `src/cli/components/parts/<ComponentName>/` when a component gets large
- Leave the original `ComponentName.tsx` as a one-line re-export barrel
- Apply the same pattern consistently across all CLI components

## Don't

- Update import paths elsewhere just because you're splitting a component — the barrel keeps them stable
- Inline all sub-parts back into `ComponentName.tsx`; keep the parts directory as the source of truth

---

**Keywords:** component split, parts directory, re-export barrel, cli components, refactor, import paths, React

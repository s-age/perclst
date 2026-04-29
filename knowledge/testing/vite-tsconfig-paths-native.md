# `vite-tsconfig-paths` Plugin Is No Longer Needed

**Type:** External

## Context

Applies to projects using Vite/Vitest that previously relied on the `vite-tsconfig-paths` plugin
to resolve TypeScript path aliases (e.g. `@/…` mapped in `tsconfig.json`). Recent Vite versions
handle this natively.

## What is true

Vite now supports tsconfig path resolution out-of-the-box via the `resolve.tsconfigPaths` option.
The third-party `vite-tsconfig-paths` package is no longer required.

```ts
// ❌ Old — requires vite-tsconfig-paths package
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [tsconfigPaths()],
})

// ✅ Current — native Vite support
export default defineConfig({
  resolve: { tsconfigPaths: true },
})
```

## Do

- Use `resolve: { tsconfigPaths: true }` in `vite.config.ts`.
- Uninstall the `vite-tsconfig-paths` package after migrating.

## Don't

- Don't keep the `vite-tsconfig-paths` plugin alongside `resolve.tsconfigPaths` — they will
  conflict or duplicate resolution.

---

**Keywords:** vite, vitest, tsconfig, paths, alias, vite-tsconfig-paths, resolve, plugin, deprecated

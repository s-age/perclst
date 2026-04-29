# Vitest `test.cache.dir` Is Deprecated

**Type:** External

## Context

Applies when configuring Vitest in `vite.config.ts` (or `vitest.config.ts`). The `test.cache.dir`
option was removed in recent Vitest versions and emits a deprecation warning if used.

## What is true

Vitest now stores its cache inside Vite's top-level cache directory.
The correct option is Vite's `cacheDir`, not the Vitest-level `test.cache`.

```ts
// ❌ Deprecated
export default defineConfig({
  test: { cache: { dir: 'node_modules/.vitest' } },
})

// ✅ Current
export default defineConfig({
  cacheDir: 'node_modules/.vite',   // vitest cache → node_modules/.vite/vitest
})
```

## Do

- Set `cacheDir` at the top-level Vite config to control where Vitest writes its cache.

## Don't

- Don't use `test.cache.dir` — it is deprecated and has no effect in current Vitest.

---

**Keywords:** vitest, vite, cache, cacheDir, test.cache.dir, deprecated, config

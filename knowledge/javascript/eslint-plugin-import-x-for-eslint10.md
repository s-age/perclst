# eslint-plugin-import Does Not Support ESLint 10

**Type:** External

## Context

When adding import-cycle detection (`import/no-cycle`) or any rule from `eslint-plugin-import` to a project running ESLint 10.

## What happened / What is true

`eslint-plugin-import@2` (latest: 2.32.0) declares peer dependency `eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9"` — ESLint 10 is explicitly excluded. `npm install` fails with `ERESOLVE`.

The maintained fork `eslint-plugin-import-x` supports `eslint@"^8.57.0 || ^9.0.0 || ^10.0.0"` and exposes the same rules under the same API surface (including `no-cycle`).

```js
import importPlugin from 'eslint-plugin-import-x'
// flat config usage:
{
  plugins: { import: importPlugin },
  rules: { 'import/no-cycle': ['error', { maxDepth: 10, ignoreExternal: true }] }
}
```

This project uses `eslint@^10.2.0`. Any future plugin advertising ESLint ≤9 peer deps will hit the same issue.

## Do

- Install `eslint-plugin-import-x` instead of `eslint-plugin-import` when targeting ESLint 10
- Check for an `-x` fork or a v3+ release before giving up on any ESLint plugin with ≤9 peer deps

## Don't

- Don't use `--legacy-peer-deps` or `--force` to install `eslint-plugin-import` under ESLint 10 — it will fail at runtime
- Don't assume `eslint-plugin-import` and `eslint-plugin-import-x` have different rule name prefixes — both use `import/`

---

**Keywords:** eslint-plugin-import, eslint-plugin-import-x, ESLint 10, ERESOLVE, peer dependency, no-cycle, flat config

# `require()` Is Unavailable in `node -e` Under ESM

**Type:** Problem

## Context

When `package.json` sets `"type": "module"`, all `.js` files and `node -e` inline scripts are
treated as ES modules. `require()` is not defined in that scope.

## What happened / What is true

Running:

```
node -e "const {existsSync} = require('fs'); ..."
```

fails with `ReferenceError: require is not defined in ES module scope`.

Two fixes are available:

1. **`--input-type=commonjs`** — forces CommonJS evaluation for the inline script only:
   ```
   node --input-type=commonjs -e "const {existsSync} = require('fs'); ..."
   ```
2. **Rewrite as ESM** — use a static import expression:
   ```
   node -e "import('fs').then(({existsSync}) => { ... })"
   ```

For anything non-trivial, extracting the logic to a TypeScript file and running it with `tsx` is
more maintainable than either workaround.

## Do

- Use `node --input-type=commonjs -e "..."` for quick CommonJS inline scripts in an ESM project
- Prefer `tsx <script>.ts` over inline `-e` for scripts longer than a single expression

## Don't

- Don't use bare `require()` in `node -e` when `"type": "module"` is present in `package.json`

---

**Keywords:** node -e, require, ESM, CommonJS, type module, --input-type=commonjs, ReferenceError, inline script, tsx

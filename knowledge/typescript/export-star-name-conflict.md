# TypeScript: `export *` Cannot Be Combined with a Same-Named Named Export

**Type:** External

## Context

When designing a re-export + override pattern in TypeScript — where a file re-exports everything
from a base module and then overrides selected exports — TypeScript will refuse to compile.

## What happened / What is true

TypeScript raises **TS2308** ("Module has already exported a binding named X") when a file contains
both:

- `export * from './some-module.js'`
- `export const X = ...` (where `X` is also exported by `some-module`)

This makes the "re-export + selective override" pattern impossible in a single file.

```ts
// TS2308 — do NOT do this:
export * from './config.default.js'
export const DEFAULT_MODEL = 'custom'  // error: already exported by the re-export above
```

## Do

- Use a copy-and-merge approach: copy the base file and modify it directly
  (e.g. `sync-config.ts` appends new exports from `config.default.ts`)
- If an override pattern is required, use an intermediary file that re-exports the overrides
  explicitly without `export *`

## Don't

- Don't rely on `export *` + a same-name `export const` in the same file to achieve overrides —
  TS2308 will block the build
- Don't confuse this with default exports; only named exports are subject to this constraint

---

**Keywords:** TS2308, export star, re-export, named export, override, TypeScript, module conflict, config.default

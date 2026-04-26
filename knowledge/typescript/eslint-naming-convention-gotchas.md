# ESLint @typescript-eslint/naming-convention Gotchas

**Type:** Problem

## Context

Applies whenever `@typescript-eslint/naming-convention` is enabled with a `variable` selector
enforcing camelCase. Two non-obvious behaviors trip up developers using destructuring or ESM
module-path helpers.

## What happened / What is true

**Destructuring binds variables, not properties.**
When you destructure an object, the bound name is a *variable* and is subject to the
`variable` selector. Type-level property names (e.g. `include_draft` in an interface) live
under the `property` selector and are unaffected.

```ts
// ❌ violation — include_draft is a variable here
const { query, include_draft } = options

// ✅ alias to camelCase
const { query, include_draft: includeDraft } = options
```

**ESM `__filename` / `__dirname` polyfills trigger a violation.**
The conventional ESM pattern uses double-underscore prefixes that conflict with camelCase
enforcement unless explicitly filtered out:

```js
// Without filter → violation on __filename
const __filename = fileURLToPath(import.meta.url)

// Rule config — add this filter to the variable selector
filter: { regex: '^__', match: false }
```

## Do

- Alias snake_case destructured names to camelCase at the binding site
- Add a `filter: { regex: '^__', match: false }` entry to the `variable` selector when
  using ESM `__filename`/`__dirname` polyfills

## Don't

- Don't assume the rule only checks property declarations — it checks the variable binding
- Don't rely on the interface property being snake_case to exempt the destructured name

---

**Keywords:** eslint, naming-convention, camelCase, destructuring, snake_case, __filename, __dirname, typescript-eslint, ESM, variable selector

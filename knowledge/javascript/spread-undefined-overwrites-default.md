# Spread with `undefined` Value Overwrites an Explicit Default

**Type:** External

## Context

Applies any time you set a default value for a key before spreading an object that may
carry that same key as `undefined`. JavaScript's object spread preserves explicit
`undefined` values, so the default is silently lost. This bit the codebase in
`AgentService.fork()`, where omitting `--name` produced `createParams.name === undefined`
that overwrote the computed default, causing forked sessions to appear as `anonymous` in
`perclst list`.

## What happened / What is true

- `{ name: 'fork of X', ...{ name: undefined } }` evaluates to `{ name: undefined }`.
- JavaScript spread does **not** skip keys whose value is `undefined`; it writes them.
- A default set before the spread is unconditionally clobbered if the spread object has
  the same key, even with `undefined`.

## Do

- Spread the incoming object first, then apply the fallback with `??`:
  ```typescript
  await sessionDomain.create({
    ...createParams,
    name: createParams.name ?? defaultName,
  });
  ```
- Use `??` (nullish coalescing) rather than `||` so that intentional empty strings are
  not replaced by the default.

## Don't

- Don't set a default before the spread and assume it survives:
  ```typescript
  // WRONG — createParams.name === undefined overwrites defaultName
  await sessionDomain.create({
    name: defaultName,
    ...createParams,
  });
  ```
- Don't rely on spread order alone to handle fallback logic; always use an explicit
  nullish coalescing expression after the spread.

---

**Keywords:** spread, undefined, default, object spread, nullish coalescing, overwrite, TypeScript, JavaScript

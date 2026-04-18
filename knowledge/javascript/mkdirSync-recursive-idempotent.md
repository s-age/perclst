# mkdirSync({ recursive: true }) is Idempotent — existsSync Guard is Unnecessary and Dangerous

**Type:** External

## Context

Applies whenever Node.js code needs to ensure a directory exists before writing files to it — common in session managers, config loaders, and any utility that creates directories on first use.

## What happened / What is true

- `mkdirSync(dir, { recursive: true })` does **not** throw if the directory already exists; it is a no-op in that case.
- Adding an `if (!existsSync(dir))` guard before the call is therefore redundant.
- More importantly, the guard introduces a **TOCTOU (Time-of-check / Time-of-use)** race: between the `existsSync` check and the `mkdirSync` call, another process can create or remove the directory, leading to unexpected errors or silent incorrect behavior.

## Do

- Call `mkdirSync(dir, { recursive: true })` directly without any existence pre-check.

```ts
// Good
mkdirSync(dir, { recursive: true });
```

## Don't

- Wrap `mkdirSync` with an `existsSync` guard — it adds a race condition and no safety.

```ts
// Bad
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}
```

---

**Keywords:** mkdirSync, existsSync, recursive, idempotent, TOCTOU, race condition, fs, Node.js, directory creation

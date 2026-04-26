# Node.js: `process.stdin.isTTY` is `undefined` When Piped

**Type:** Problem

## Context

Any CLI command that uses `process.stdin.isTTY` as a non-interactive guard — e.g., to skip
readline prompts when stdin is piped. Affects `src/cli/commands/import.ts` and
`src/cli/commands/rename.ts`.

## What happened / What is true

`process.stdin.isTTY` has type `boolean | undefined`:
- Interactive terminal (TTY): `true`
- Piped or redirected stdin: `undefined` (property is absent — never `false`)

The guard `process.stdin.isTTY !== false` is always `true` because `undefined !== false`
evaluates to `true`. The non-interactive branch never executes when stdin is piped.

## Do

- Use `!!process.stdin.isTTY` or `=== true` to coerce `undefined` to `false`

```ts
// Correct: coerce undefined → false
if (!!process.stdin.isTTY) { /* interactive only */ }
```

## Don't

- Don't use `process.stdin.isTTY !== false` as a non-interactive guard

```ts
// Wrong: undefined !== false → true, guard fires even when piped
if (process.stdin.isTTY !== false) { /* runs even in non-interactive context */ }
```

---

**Keywords:** isTTY, stdin, piped, non-interactive, TTY, readline, CLI guard, undefined, boolean, process.stdin

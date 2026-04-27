# `import.meta.url` Resolves Symlinks — Use `process.argv[1]` for Invocation Path

**Type:** External

## Context

Node.js ES modules. Applies whenever a script is installed as a symlink (e.g. a global
hook placed at `~/.perclst/skill-inject.mjs` → `hooks/skill-inject.mjs`) and the
script needs to detect *which path the caller used* to invoke it.

## What happened / What is true

- `import.meta.url` always resolves to the **real file path** — symlinks are followed.
- `process.argv[1]` preserves the path **as passed to Node.js**, keeping the symlink intact.
- A dedup guard in `hooks/skill-inject.mjs` used `import.meta.url` to decide "am I the
  global script?" Both the symlinked global copy and the project-local copy resolved to
  the same real path, so the guard exited early for both — resulting in zero injections.

## Do

- Use `process.argv[1]` when you need to know *how this script was invoked* (symlink path
  vs. real path, global vs. local copy).
- Use `import.meta.url` only for resolving paths **relative to the module's own location**,
  e.g. `new URL('../data', import.meta.url)`.

## Don't

- Don't use `import.meta.url` in dedup guards or identity checks that depend on the
  invocation path — it will always return the real, resolved path regardless of symlinks.

---

**Keywords:** import.meta.url, symlink, process.argv, Node.js, ESM, dedup guard, invocation path, hook, global script

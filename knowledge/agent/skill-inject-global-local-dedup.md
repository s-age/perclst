# skill-inject Hook: Global vs Local Deduplication

**Type:** Problem

## Context

Applies when perclst is installed both globally (`npm link` / package install) and as a
project-local dev dependency. Both installations register a `skill-inject.mjs` `PreToolUse`
hook in Claude Code, so both can fire simultaneously during a session.

## What happened / What is true

- When `~/.perclst/hooks/skill-inject.mjs` (global) and the project-local
  `hooks/skill-inject.mjs` are both registered as Claude Code hooks, both fire on each tool
  use.
- This causes the same skill to be injected twice into `additionalContext`, wasting context
  window tokens and potentially confusing the agent with duplicate instructions.
- The fix: the project-local hook checks its own path via `import.meta.url` and exits early
  if the global installation exists and the running script is **not** under it.

```js
const homePerclst = join(homedir(), '.perclst')
const scriptPath = new URL(import.meta.url).pathname
if (existsSync(homePerclst) && !scriptPath.startsWith(homePerclst + '/')) process.exit(0)
```

- The global installation is preferred because it is typically more up-to-date.
- `import.meta.url` is reliable for self-path detection in ES modules (the hook uses `import`).
- This guard must come **after** the `PERCLST_SESSION_FILE` guard — if not in headless mode the
  hook already exits before reaching it, so ordering only matters on the headless path.

## Do

- Place the global/local dedup guard early in the hook script, right after the session-file guard.
- Use `import.meta.url` (not `__filename`) for self-path detection in ES module hooks.
- Defer entirely to the global installation when `~/.perclst/` exists.

## Don't

- Don't register the same hook from both global and local installations without a dedup guard.
- Don't place the dedup guard before the `PERCLST_SESSION_FILE` guard — the session guard is the
  first exit and must remain first.

---

**Keywords:** skill-inject, hook deduplication, global installation, local installation, additionalContext, double injection, import.meta.url, PreToolUse, ES module, npm link

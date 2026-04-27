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
- The fix: the project-local hook checks its own invocation path via `process.argv[1]` and exits
  early if the global script file exists and the running script is **not** under `~/.perclst/`.

```js
const homePerclstScript = join(homedir(), '.perclst/skill-inject.mjs')
const scriptPath = process.argv[1]
if (existsSync(homePerclstScript) && !scriptPath.startsWith(join(homedir(), '.perclst') + '/')) process.exit(0)
```

- The global installation is preferred because it is typically more up-to-date.
- **`process.argv[1]` must be used instead of `import.meta.url`**: `import.meta.url` resolves
  symlinks to the real path, so both the global symlink and the project-local file would resolve
  to the same real path — defeating the guard. `process.argv[1]` preserves the invocation path.
- Check for the specific script file (`skill-inject.mjs`), not the parent directory — `~/.perclst/`
  is a data/runtime directory that always exists after any `perclst` invocation, so it is not a
  valid installation marker.
- This guard must come **after** the `PERCLST_SESSION_FILE` guard — if not in headless mode the
  hook already exits before reaching it, so ordering only matters on the headless path.

## Do

- Place the global/local dedup guard early in the hook script, right after the session-file guard.
- Use `process.argv[1]` for self-path detection in hooks — it preserves symlink paths as invoked.
- Check for the specific global script file (`~/.perclst/skill-inject.mjs`), not the directory.
- Defer entirely to the global installation when that script file exists.

## Don't

- Don't register the same hook from both global and local installations without a dedup guard.
- Don't place the dedup guard before the `PERCLST_SESSION_FILE` guard — the session guard is the
  first exit and must remain first.

---

**Keywords:** skill-inject, hook deduplication, global installation, local installation, additionalContext, double injection, import.meta.url, PreToolUse, ES module, npm link

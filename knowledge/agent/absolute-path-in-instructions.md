# Agent Instructions Must Use Absolute Paths for Directories

**Type:** Problem

## Context

When `perclst` builds the instruction string passed to a sub-agent, any directory reference in that string is resolved by the sub-agent relative to its own working directory at invocation time — not relative to the target repository. This applies to any command that spawns an agent with a path in its prompt.

## What happened / What is true

- `perclst curate` passed `knowledge/draft/` as a relative path in the agent instruction.
- When invoked from outside the target repo, the sub-agent resolved the path against `process.cwd()` at invocation time and found nothing.
- The fix was to inject the absolute path using `cwdPath('knowledge')` into the instruction string.

## Do

- Always resolve directories to absolute paths before embedding them in agent instructions.
- Use a utility like `cwdPath('knowledge')` that anchors to the target repo's root.

```ts
const instruction = `Promote all draft entries in ${cwdPath('knowledge/draft/')} ...`
```

## Don't

- Don't embed relative paths (e.g., `knowledge/draft/`) in agent instruction strings.
- Don't assume the sub-agent's cwd matches the user's cwd — it may not when the tool is installed globally.

---

**Keywords:** agent instruction, absolute path, relative path, cwd, curate, sub-agent, path injection, cwdPath

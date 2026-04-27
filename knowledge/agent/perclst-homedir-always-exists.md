# `~/.perclst` Directory Always Exists — Not a Valid Installation Marker

**Type:** Problem

## Context

Applies when writing a guard inside `skill-inject.mjs` that detects whether the global perclst
hook is installed. `~/.perclst` is perclst's data/config directory (sessions, `config.json`,
etc.) and is created on first run, so it is always present on any machine that has run perclst.

## What happened / What is true

- `existsSync(join(homedir(), '.perclst'))` returns `true` even when no global hook script has
  ever been installed — because the directory is perclst's runtime data store, not an
  installation marker.
- A dedup guard that keyed on directory existence caused the project-local hook to always exit
  early, injecting nothing, regardless of whether the global hook was actually present.
- The correct marker is the specific script file, not the parent directory.

## Do

- Check for the specific script to detect global hook installation:
  ```js
  existsSync(join(homedir(), '.perclst/skill-inject.mjs'))
  ```
- Use the narrowest possible existence check (file, not directory) when testing for a specific
  installed artifact.

## Don't

- Don't use `existsSync(join(homedir(), '.perclst'))` as a proxy for "the global hook is
  installed" — the directory is always present after any `perclst` invocation.
- Don't assume a data/config directory signals the presence of any particular installed file
  within it.

---

**Keywords:** perclst, ~/.perclst, existsSync, installation detection, skill-inject, global hook, dedup guard, always exists, data directory

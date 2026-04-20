# $CLAUDE_PROJECT_DIR in Global Hooks Resolves to the Active Project

**Type:** Discovery

## Context

When a hook command is configured in `~/.claude/settings.json` (global Claude Code settings),
any reference to `$CLAUDE_PROJECT_DIR` inside that command is expanded at hook execution time
to the **currently active project root** — not the repo where the hook was originally written.

## What happened / What is true

- A hook registered as `node "$CLAUDE_PROJECT_DIR"/hooks/skill-inject.mjs` in `~/.claude/settings.json`
  works only when Claude Code is running from the perclst repo itself.
- From any other project, `$CLAUDE_PROJECT_DIR` resolves to that project's root, where
  `hooks/skill-inject.mjs` does not exist.
- The hook silently fails with no error surfaced to the user.

## Do

- Copy hook scripts to a stable, absolute location (e.g. `~/.perclst/skill-inject.mjs`) during
  install (`npm run setup`).
- Write the absolute path into `~/.claude/settings.json` instead of a `$CLAUDE_PROJECT_DIR`-relative
  path, so the hook works regardless of which project is active.

## Don't

- Don't reference `$CLAUDE_PROJECT_DIR` in global hook commands when the script lives inside one
  specific repo — it won't be found from any other project.
- Don't assume hook failures are visible; Claude Code suppresses hook errors silently.

---

**Keywords:** CLAUDE_PROJECT_DIR, hooks, global settings, skill-inject, hook scope, settings.json, silent failure

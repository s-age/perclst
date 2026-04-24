# Meta-Librarian Skill Is Injected via Hook, Not Skill Tool

**Type:** Discovery

## Context

When the librarian agent starts (invoked as the `meta-librarian/curate` procedure via `claude -p`),
it may try to call `Skill("meta-librarian")` to load its instructions. This always fails.
Understanding how the skill actually arrives prevents wasted attempts at the start of every run.

## What happened / What is true

- `Skill("meta-librarian")` returns `Unknown skill: meta-librarian` — the Skill tool registry
  does not contain it in headless mode.
- The meta-librarian instructions are injected automatically by the `skill-inject.mjs`
  `PreToolUse` hook as `additionalContext` the first time a matching tool (e.g. `Glob`, `Read`)
  is called.
- No explicit invocation is needed; the instructions arrive before the first file operation completes.
- This is consistent with the general rule that `Skill()` is unavailable inside `claude -p`
  (see `knowledge/agent/skill-tool-headless-unavailable.md`).

## Do

- Proceed directly to reading `knowledge/draft/` files — the skill instructions will have already
  been injected by the time the first tool call returns.
- Treat the injected `additionalContext` block as the authoritative meta-librarian instructions.

## Don't

- Don't call `Skill("meta-librarian")` at the start of a librarian run; it will always fail.
- Don't wait for the skill to be "loaded" — it is not loaded explicitly, it arrives via hook.

---

**Keywords:** meta-librarian, skill injection, PreToolUse hook, headless, claude -p, Skill tool, meta-librarian/curate, additionalContext

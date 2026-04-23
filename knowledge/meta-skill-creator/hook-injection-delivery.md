# Skill Delivery via PreToolUse Hook (Not the Skill Tool)

**Type:** Discovery

## Context

When a librarian or headless agent tries to load a skill with `Skill("meta-librarian")`, the call
fails. Some skills are not registered as callable slash-commands. Instead their content is injected
automatically via a `PreToolUse` hook that fires on a specific tool call (e.g., `Read`).

## What happened / What is true

- `Skill({ skill: "meta-librarian" })` returns "Unknown skill" — the skill is not in the callable registry.
- A `PreToolUse:Read` hook fires on the agent's first `Read` call, injecting the full skill content
  inside a `<system-reminder>` block labelled `=== Skill: meta-librarian ===`.
- The injected block includes the note: _"HEADLESS MODE: The Skill tool is not available. Execute
  these instructions directly without invoking Skill()."_
- The `Skill()` call is otherwise harmless — it wastes one round-trip but does not break the session.

## Do

- Issue any `Read` call early in the session; the hook will inject the skill instructions automatically.
- Treat the injected `<system-reminder>` content as authoritative — follow it directly without
  trying to invoke `Skill()` again.

## Don't

- Don't assume all skills are callable via `Skill()` — some are hook-delivered only.
- Don't call `Skill()` in a retry loop after "Unknown skill"; the tool is simply not registered.

---

**Keywords:** meta-librarian, PreToolUse, hook, skill injection, headless mode, system-reminder, skill delivery, HEADLESS MODE

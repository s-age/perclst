# Skill Tool Unavailable in Headless Mode

**Type:** Discovery

## Context

When a sub-agent is launched via `claude -p` (headless mode), the set of registered tools differs from an interactive Claude Code session. This matters whenever a skill injects instructions that reference `Skill()` calls.

## What happened / What is true

- The `Skill` tool is only registered in interactive Claude Code sessions.
- In headless mode (`claude -p`), calling `Skill(foo)` returns `is_error: true` — the tool simply does not exist.
- Skill *content* is still delivered in headless mode: the `skill-inject.mjs` PreToolUse hook injects matching SKILL.md bodies as `additionalContext`.
- The sub-agent must execute those injected instructions directly rather than re-invoking `Skill()`.

## Do

- Prepend a note to every injected skill context block explicitly telling the agent not to call `Skill()` and to execute the instructions directly.
- Treat injected `additionalContext` as the authoritative instructions — act on them in-line.

## Don't

- Don't call `Skill()` from within a `claude -p` sub-agent; it will always fail with `is_error: true`.
- Don't assume the tool list inside `claude -p` mirrors an interactive session.

---

**Keywords:** Skill tool, headless, claude -p, additionalContext, skill-inject, is_error, sub-agent, PreToolUse hook

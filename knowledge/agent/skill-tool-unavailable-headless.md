# Skill Tool Unavailable in Headless Mode

**Type:** Problem

## Context

When an agent runs via `claude -p` (headless mode), the `Skill` tool is not injected
into the tool list. Any procedure that says "Consult the X skill" will silently fail
to load it unless the agent is told to use `Read` on the SKILL.md file directly.

## What happened / What is true

- The `Skill` tool is only available in interactive Claude Code sessions, not in `claude -p` runs.
- Procedures referencing skills (e.g. "Consult the `meta-librarian` skill") produce no error
  but also load nothing — the agent proceeds without the skill's instructions.
- Two mechanisms compensate for this:
  1. `HEADLESS_SKILL_NOTE` prepended to all system prompts in `AgentDomain.run()`
  2. The skill-inject hook's `additionalContext`, which also includes a headless mode note.
- Both notes instruct the agent to use `Read` on `.claude/skills/<name>/SKILL.md` instead.

## Do

- Keep `HEADLESS_SKILL_NOTE` in `AgentDomain.run()` so all headless agents know to use `Read`.
- When writing procedures that reference skills, phrase it as:
  "Read `.claude/skills/<name>/SKILL.md` directly" rather than "Use the Skill tool".
- Test procedure skill loading in headless mode, not just in interactive sessions.

## Don't

- Don't assume `Skill` tool calls work inside `claude -p` — they will silently no-op.
- Don't remove or shorten `HEADLESS_SKILL_NOTE`; it is the primary guard against silent failures.

---

**Keywords:** skill tool, headless, claude -p, HEADLESS_SKILL_NOTE, skill-inject, AgentDomain, procedure, silent failure

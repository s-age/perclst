# Skill Lifecycle — Context Budget, Compaction, and Deduplication

**Type:** Discovery

## Context

Applies whenever authoring or debugging Claude Code skills. These mechanics govern
how skill content is loaded into Claude's context window, how it survives session
compaction, and how notification deduplication works.

## What happened / What is true

### Description budget

- All skill descriptions are loaded into context so Claude knows what is available —
  **even before any skill is invoked**.
- Budget scales at **1 % of context window**, with a fallback of 8,000 chars; each
  individual entry is capped at 250 chars regardless.
- `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var raises the per-entry cap.
- `disable-model-invocation: true` removes the skill from Claude's context entirely —
  description is not loaded, no token cost, Claude cannot auto-invoke it.

### After compaction

- When the conversation is summarized, Claude Code re-attaches the **most recent
  invocation** of each skill (first 5,000 tokens of its content).
- Shared re-attachment budget across all skills: **25,000 tokens**, filled from
  most-recently-invoked first — older skills may be dropped entirely.
- If a skill stops influencing behavior mid-session, re-invoke it manually after
  compaction.

### `sentSkillNames` deduplication

- Within a session, Claude is notified of each skill **at most once**.
- The notification message can be evicted by compaction, but the skill remains
  registered in the `dynamicSkills` Map and stays callable.

## Do

- Keep skill descriptions under 250 chars — anything beyond is silently truncated.
- Re-invoke critical skills manually if behavior drifts after compaction.
- Use `disable-model-invocation: true` for utility skills that should only be called
  explicitly, saving context budget.

## Don't

- Don't assume a skill's instructions persist across compaction without re-invocation.
- Don't rely on auto-invocation for skills you need predictably — invoke explicitly
  for reliable behavior.

---

**Keywords:** skill lifecycle, context budget, compaction, deduplication, sentSkillNames, disable-model-invocation, description budget, SLASH_COMMAND_TOOL_CHAR_BUDGET

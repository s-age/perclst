# meta-librarian Skill Is Delivered via Hook, Not Skill Tool

**Type:** Discovery

## Context

When running the librarian agent, the first step in the flowchart calls for consulting
the `meta-librarian` skill. It is tempting to call `Skill("meta-librarian")` — this
fails. The skill content arrives via a different mechanism.

## What happened / What is true

- Calling `Skill("meta-librarian")` returns `Unknown skill: meta-librarian`.
- The skill content is injected automatically as a `system-reminder` via a PreToolUse
  hook that fires on the `Glob` tool.
- The hook delivers the full skill instructions into context on the first `Glob` call
  made during a librarian session.
- No explicit `Skill()` invocation is needed or helpful.

## Do

- Proceed directly to the first `Glob` or `Read` call; the meta-librarian instructions
  will appear in context automatically via the hook.

## Don't

- Don't call `Skill("meta-librarian")` — it is not registered as a named skill and
  will always return `Unknown skill`.
- Don't block on retrieving skill content before reading draft files; issue the `Glob`
  call and the instructions arrive alongside the result.

---

**Keywords:** meta-librarian, skill, hook, PreToolUse, Glob, system-reminder, delivery

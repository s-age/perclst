# meta-librarian Skill Is Injected via PreToolUse:Glob Hook

**Type:** Discovery

## Context

When a Claude agent (e.g. the librarian agent) starts a session and calls `Skill("meta-librarian")`, it always
fails with "Unknown skill: meta-librarian". This is not a bug. The skill is not registered as a
user-invocable entry in the harness; instead, its content is injected automatically as `PreToolUse:Glob`
hook context the first time any `Glob` call is made during the session.

## What happened / What is true

- `Skill("meta-librarian")` always raises `Unknown skill: meta-librarian` — expected and harmless.
- The skill content (classification rules, file format, placement guide) arrives as a side-effect of
  the first `Glob` tool call, delivered by the `PreToolUse:Glob` hook.
- This delivery mechanism is intentional: the librarian agent reads `knowledge/draft/` with `Glob`,
  and the skill instructions arrive at exactly that moment.
- Subsequent tool calls in the session have full skill context without any further action.

## Do

- Attempt `Skill("meta-librarian")` at startup — the error is harmless and documents intent.
- Call `Glob` on `knowledge/draft/` as the next step; skill content will arrive in hook context.
- Proceed with classification and promotion using the injected instructions.

## Don't

- Don't treat the `Skill()` failure as a blocker or retry it.
- Don't look for meta-librarian in the user-invocable skills list — it is deliberately absent.
- Don't skip the initial `Glob` call; without it the skill instructions are never injected.

---

**Keywords:** meta-librarian, skill, hook, PreToolUse, Glob, injection, headless, activation, delivery

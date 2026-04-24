# Good/Bad Examples in Skills Can Contradict the Same Skill's Prohibitions

**Type:** Problem

## Context

Architecture skills (`arch-*`) typically contain both code examples (Good/Bad) and a Prohibitions section. These two sections are written independently and can silently contradict each other — especially when a skill is updated incrementally over time.

## What happened / What is true

In `arch-repositories/SKILL.md`, the "Dual export style" pattern's **Good** code example showed:

```ts
// Good — sessions.ts: class delegates to the same standalone functions
export type ISessionRepository = {
  save(session: Session): void
  ...
}
```

The same skill's Prohibitions section explicitly stated: **"Never define a port type (`IXxx`) in a repository implementation file — port types belong in `src/repositories/ports/`"**

The Good example violated the prohibition it was supposed to reinforce. Readers copying the Good example would introduce an architecture violation.

The correct pattern was: import the port type from `ports/session.ts` — never define it in the implementation file.

## Do

- Before publishing or updating a skill, cross-check every **Good** example against the Prohibitions section: confirm it violates none of them.
- Cross-check every **Bad** example: confirm it violates at least one stated rule.
- Verify examples against **actual source code** in the codebase — patterns in source are the ground truth.

## Don't

- Don't write code examples in isolation from the rest of the skill file.
- Don't leave contradictory Good/Bad examples — a Good example that violates a prohibition actively teaches the wrong pattern and is worse than having no example.

---

**Keywords:** Good example, Bad example, Prohibitions, contradiction, arch-repositories, port type, IXxx, architecture violation, skill review, code example consistency

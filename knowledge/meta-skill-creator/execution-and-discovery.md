# Skill Execution and Discovery — Forking, Paths, and Monorepo

**Type:** Discovery

## Context

Applies when a skill needs to spawn a subagent, when configuring `paths` for
auto-activation, or when organizing skills inside a monorepo. These three behaviors
are independent but all relate to how skills are found and run.

## What happened / What is true

### Subagent execution (`context: fork`)

- When a skill's context is `fork`, the SKILL.md content becomes the task prompt
  for a forked agent.
- Specify `agent: Explore` for read-only research or `agent: Plan` for design work.
- Without an actionable task in the content the subagent returns nothing useful —
  vague instructions produce empty results.

### `paths` only affects auto-activation

- `paths` gates whether Claude **automatically loads** the skill when you open or
  edit matching files.
- Manual `/skill-name` invocation always works regardless of `paths` configuration.
- Set `paths` only to reduce noise; never rely on it to *restrict* access.

### Nested discovery in monorepos

- When editing `packages/frontend/src/foo.ts`, Claude Code also looks for skills in
  `packages/frontend/.claude/skills/`.
- Use package-local skills for concerns that only apply to one sub-package.

## Do

- Include a concrete, actionable task in forked-skill content so the subagent has
  something to execute.
- Use `paths` to narrow auto-activation to relevant file patterns; keep skill
  descriptions concise for everything else.
- Place package-specific skills in the package's own `.claude/skills/` directory in
  a monorepo.

## Don't

- Don't omit the actionable task from a `context: fork` skill — the subagent needs
  explicit instructions.
- Don't use `paths` as a security or access-control mechanism; it only affects
  auto-loading.

---

**Keywords:** context fork, subagent, forked agent, Explore agent, Plan agent, paths, auto-activation, monorepo, nested discovery, package-local skills

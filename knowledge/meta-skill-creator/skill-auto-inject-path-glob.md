# Broad Path Globs Cause Unintended Skill Injection

**Type:** Problem

## Context

Skills declare a `paths` glob in their frontmatter to limit auto-activation to relevant
files. A glob that is too broad (e.g. `.claude/skills/**`) can trigger injection whenever
an agent reads *any* file under that tree — including unrelated skill files.

## What happened / What is true

- The skill-inject hook evaluates `paths` globs against every file an agent reads.
- A skill with `paths: ['.claude/skills/**']` fires for every Read inside `.claude/skills/`,
  injecting its instructions into contexts where they are not needed.
- Setting `auto-inject: false` in a skill's frontmatter excludes it from hook-based injection
  entirely, while still making it loadable via `Read` in interactive mode.

## Do

- Set `auto-inject: false` on skills whose `paths` glob would match many unrelated files.
- Use `auto-inject: false` for background-knowledge skills that should only be loaded
  explicitly (e.g. legacy context, meta-skills that describe other skills).
- Prefer narrow globs (`src/mcp/**`) over broad ones (`.claude/**`).

## Don't

- Don't use a catch-all glob like `.claude/skills/**` without also setting `auto-inject: false`.
- Don't rely solely on `paths` breadth to control injection — use `auto-inject` as the explicit off-switch.

---

**Keywords:** auto-inject, paths glob, skill injection, frontmatter, skill-inject hook, unintended injection

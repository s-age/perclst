# Skill description Field Truncates at ~150 Characters in Practice

**Type:** Discovery

## Context

The `description` field in SKILL.md frontmatter is the primary signal for triggering a skill automatically. The meta-skill-creator spec says it is "hard-truncated at 250 chars" but notes that "the essential signal" should fit in the first ~150 chars. In practice, some UIs and harnesses stop reading earlier.

## What happened / What is true

- The `meta-skill-creator` validator warns when the description trigger phrase extends past 150 chars but does not fail — the skill is still valid.
- A skill that passes validation can still behave incorrectly at runtime if its key trigger term appears after the 150-char mark.
- Example: a description of "Arch-cli skill for the CLI layer, covering commands, argument parsing, PipelineRunner, and their architectural rules" has the critical term "commands" at char 45 — safe. A longer preamble like "Use when writing or reviewing files in the CLI layer which includes commands, argument parsing…" puts "commands" at char 70 — still safe, but only by habit of front-loading.

## Do

- Put the most discriminating trigger term in the **first 60–80 characters** of `description` — well inside both the 150-char soft limit and the 250-char hard limit.
- Always run the validator (`bash .claude/skills/meta-skill-creator/scripts/validate.sh <skill>`) after writing or editing the `description` field; review any warnings even on overall "OK" status.
- Treat validator "warn" as "fix now" for the description field specifically, since truncation silently degrades skill activation.

## Don't

- Don't front-load generic context ("Use when working on…", "Applies to the layer that…") before the trigger term — it pushes the key signal past the safe zone.
- Don't assume "validator passed = works correctly" — the validator warns but doesn't block on description length beyond 250 chars.

---

**Keywords:** description, truncation, 150 chars, 250 chars, frontmatter, validator, trigger phrase, skill activation, SKILL.md

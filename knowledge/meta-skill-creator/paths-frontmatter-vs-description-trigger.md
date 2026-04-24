# `paths:` Frontmatter Makes "Load before…" in Description Redundant

**Type:** Discovery

## Context

Applies when writing or auditing a skill that uses the `paths:` frontmatter field to scope
auto-activation to specific file globs (e.g. `src/foo/**/*.ts`).

## What happened / What is true

- A skill with `paths:` is auto-loaded by Claude whenever a matching file is involved —
  creating, editing, reviewing, or investigating it all trigger the load.
- Adding a phrase like "Load before creating, editing, reviewing, or investigating files
  in this layer." to `description` duplicates that behavior and wastes the first-150-char
  trigger budget.
- Four `arch-*` skills exceeded the 150-char description limit solely because of this phrase,
  causing `validate.sh` warnings.
- The `description` field for a `paths`-scoped skill has a different job: help Claude
  recognize the relevant context *before* any specific file is opened (e.g., "let's add a
  new error class" → arch-errors skill).

## Do

- Use layer-specific nouns and concepts in `description` so Claude recognises the context
  from a user's intent, not from a file already being open.
- Rely on `paths:` alone to trigger loading when an in-scope file is involved.

## Don't

- Don't add generic action verbs ("Load before creating, editing, reviewing…") to the
  description of a `paths`-scoped skill — they are redundant and consume the signal budget.
- Don't pad `description` past ~150 chars with boilerplate; the field is hard-truncated
  at 250 chars and the first 150 carry the most weight.

---

**Keywords:** paths, frontmatter, description, trigger, auto-load, skill, meta-skill-creator, validate.sh, 150-char limit

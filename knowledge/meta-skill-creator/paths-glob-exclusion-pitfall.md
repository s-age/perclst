# `paths` Glob Exclusion Breaks Unrelated Subdirectories

**Type:** Problem

## Context

Applies when writing skill `paths` globs that need to cover a directory tree
while excluding one subdirectory (e.g. `knowledge/draft/`). Gitignore-style
character classes look like a natural fit for exclusion but behave incorrectly.

## What happened / What is true

- Attempting to exclude `knowledge/draft/` with `knowledge/[!d]*` also
  excludes any directory whose name does not start with `d` — e.g.
  `knowledge/architectures/`, `knowledge/agent/`, etc.
- Tighter patterns like `knowledge/[d][!r]*` still collaterally exclude other
  `d*` directories that don't match the remainder, and are fragile against
  directory renames.
- Gitignore-style `paths` does not support a direct negation syntax (`!`)
  for subdirectories within a match rule.

## Do

- Use `knowledge/**` (or the broadest correct scope) for the `paths` inclusion.
- Put exclusion logic in the skill body itself: write an explicit rule such as
  "do not write directly to `knowledge/draft/`" or "only operate on files
  outside `draft/`".
- Keep `paths` as an **inclusion** gate only; enforce exclusions through
  prose instructions in `SKILL.md`.

## Don't

- Don't use character-class negation (`[!x]*`) in `paths` to exclude a
  subdirectory — it silently drops other directories too.
- Don't craft increasingly complex glob patterns to approximate negation;
  they are brittle and hard to read.
- Don't assume `paths` supports `!exclusion` syntax the way `.gitignore` does
  at the rule level.

---

**Keywords:** paths, glob, exclusion, character class, skill frontmatter, knowledge draft, directory scoping, gitignore

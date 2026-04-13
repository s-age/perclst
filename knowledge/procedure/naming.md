# Procedure File Naming Conventions

**Type:** Discovery

## Context

Applies when creating or renaming files under `procedures/`. Consistent naming makes the purpose
of each procedure discoverable and supports namespace-scoped agent families.

## What happened / What is true

**Format:** `[namespace-]<verb>-<subject>.md`

- Must start with a verb that describes what the agent does (e.g. `curate`, `review`, `implement`).
- Use a hyphen-separated namespace prefix for scoped agents (`meta-`, `analyze-`, `review-`).
- Omit the prefix for general-purpose procedures.
- Lowercase, hyphens only — no underscores, no camelCase.

**Examples:** `meta-curate-knowledge.md`, `review-code.md`, `implement-feature.md`

### Verb vocabulary: `curate` vs `promote`

Prefer `curate` over `promote` for knowledge-organisation tasks.

- `promote` carries a CI/CD connotation (one-directional pipeline movement).
- `curate` implies active selection, classification, and structuring — which is what the librarian
  agent actually does.

## Do

- Start every procedure filename with a verb.
- Use a namespace prefix (`meta-`, etc.) for agent families that share a scope.
- Use `curate` when the task involves organising or structuring knowledge.

## Don't

- Don't use noun-first names (e.g. `knowledge-curation.md`).
- Don't use underscores or mixed case.
- Don't use `promote` as a verb when `curate` is more accurate.

---

**Keywords:** procedure, naming, conventions, namespace, verb, curate, promote, filename

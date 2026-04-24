# Procedure File Naming Conventions

**Type:** Discovery

## Context

Applies when creating or renaming files under `procedures/`. Consistent naming makes the purpose
of each procedure discoverable and supports namespace-scoped agent families.

## What happened / What is true

**Format:** `<verb>.md` inside `procedures/<skill>/`

- The skill directory provides the domain context, so the filename is the verb alone.
- Must be a verb that describes what the agent does (e.g. `curate`, `review`, `implement`, `inspect`).
- Referenced as `<skill>/<verb>` (e.g. `--procedure meta-librarian/curate`).
- Lowercase, hyphens only — no underscores, no camelCase.

**Examples:** `meta-librarian/curate.md`, `arch/review.md`, `test-unit/implement.md`

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

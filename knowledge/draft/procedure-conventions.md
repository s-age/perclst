# Procedure Conventions

## What-only rule

Procedure files define **What** an agent does, never How. How details belong in skills and are injected at runtime. Every procedure contains exactly one Mermaid flowchart as its primary structure.

If a flowchart node describes an implementation step (How), strip it and add a `Consult the <skill> skill` line at the bottom of the file instead.

## Naming

Format: `[namespace-]<verb>-<subject>.md`

- Must start with a verb describing what the agent does (e.g. `curate`, `review`, `implement`)
- Use hyphen-separated namespace prefix for scoped agents (`meta-`, `analyze-`, `review-`)
- No prefix for general-purpose procedures
- Lowercase, hyphens only

Examples: `meta-curate-knowledge.md`, `review-code.md`, `implement-feature.md`

## curate vs promote

`curate` is preferred over `promote` for knowledge organization tasks. `promote` implies one-directional pipeline movement (CI/CD connotation). `curate` implies active selection, classification, and structuring — which is what the librarian agent actually does.

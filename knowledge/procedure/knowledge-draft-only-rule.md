# Knowledge Files Must Be Written to Draft Only

**Type:** Discovery

## Context

Applies to any agent or conversation that captures knowledge during a task. Perclst enforces a curation boundary: structured files under `knowledge/` subdirectories are managed exclusively by the `meta-librarian/curate` procedure.

## What happened / What is true

- `CLAUDE.md` explicitly states: only the `meta-librarian/curate` procedure may write directly to `knowledge/` (outside of `draft/`).
- All agents and conversations must write freeform notes to `knowledge/draft/` only.
- Promotion from draft to structured knowledge is done by running:
  ```bash
  perclst start "Promote all draft knowledge" --procedure meta-librarian/curate --allowed-tools Write Read Bash Glob --output-only
  ```
- Writing directly to `knowledge/<subdir>/` bypasses curation and violates the project rule.

## Do

- Drop freeform `.md` notes in `knowledge/draft/` immediately after any task
- Let the `meta-librarian/curate` procedure handle structuring and subdirectory placement

## Don't

- Write structured files directly to `knowledge/<subdir>/` from within agent tasks
- Create new subdirectories under `knowledge/` from within agent tasks
- Wait until later to capture knowledge — write to draft immediately

---

**Keywords:** knowledge, draft, curation, meta-librarian/curate, procedure, write rule, knowledge/draft

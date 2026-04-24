---
name: meta-librarian
description: Promote knowledge/draft/ entries into structured knowledge/ files. Use when asked to organize, file, or promote draft knowledge, or when knowledge/draft/ has new entries.
paths:
  - 'knowledge/**'
---

Write all knowledge files in **English**, regardless of the language used in the draft.

## Processing steps

1. Read all files under `knowledge/draft/`
2. For each distinct piece of knowledge, determine its type (see Classification)
3. Choose the best-fit subdirectory (see File placement)
4. Write the promoted file using the format in `template.md`
5. Verify the file has: type, context, do/don't sections, keywords line, and is ≤80 lines
6. Delete the draft entry only after the promoted file is written

## Classification

Every piece of knowledge falls into one of three types. Lead each file with the type:

- **Problem** — something that broke, caused confusion, or was a gotcha
- **Discovery** — something learned about how the system works or should work
- **External** — facts from third-party docs, libraries, or tools (not derived from this repo)

## File placement

Map knowledge to the existing subdirectory that best fits, or create a new one.
Prefer narrowing over broadening — put it closer to the specific component than the generic category.

Current directories: `agent/`, `architectures/`, `cli-commands/`, `config/`, `mcp-tools/`, `meta-skill-creator/`, `procedure/`, `services/`, `utils/`

## File format

Use `template.md` as the base for every promoted file.

Rules:
- `Keywords` line is **required** on every file — use terms a future reader would search for
- No process notes, no meta-commentary, no "this was written because…" — knowledge only
- Target **30–80 lines** per file; split if longer
- If one draft entry contains multiple distinct topics, write one file per topic

## Splitting long files

When a file would exceed ~80 lines, split at a natural boundary. If two or more files share a theme, group them in a subdirectory.

## After processing

- `knowledge/draft/` contains a `.gitkeep` — leave the directory in place; do not remove it
- git history is the safety net for deleted draft entries

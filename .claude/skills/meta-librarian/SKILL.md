---
name: meta-librarian
description: Promote knowledge/draft/ entries into structured knowledge/ files. Use when asked to organize, file, or promote draft knowledge, or when knowledge/draft/ has new entries.
paths:
  - knowledge/**
disable-model-invocation: true
---

Write all knowledge files in **English**, regardless of the language used in the draft.

Read all files under `knowledge/draft/`. For each distinct piece of knowledge, classify it and write it to `knowledge/` as a structured file. Delete from draft only after the promoted file is written.

## Classification

Every piece of knowledge falls into one of three types. Lead each file with the type:

- **Problem** — something that broke, caused confusion, or was a gotcha
- **Discovery** — something learned about how the system works or should work
- **External** — facts from third-party docs, libraries, or tools (not derived from this repo)

## File placement

Map knowledge to the existing subdirectory that best fits, or create a new one:

```
knowledge/
  agent/          sub-agent behavior, forking, output handling
  architectures/  system design decisions and trade-offs
  cli-commands/   CLI patterns, Commander.js, display layer
  config/         config loading, priority, schema
  mcp-tools/      MCP tool authoring and server registration
  meta-skill-creator/  skill authoring patterns
  procedure/      procedure / system prompt conventions
  services/       external service integrations
  utils/          small shared utilities
```

If no directory fits, create one. Prefer narrowing over broadening — put it closer to the specific component than the generic category.

## File format

```markdown
# <Title>

**Type:** Problem | Discovery | External

## Context

One paragraph: what situation this applies to, when it matters.

## What happened / What is true

Concise facts. Use bullet points for lists, prose for narrative.

## Do

- Concrete actions to take

## Don't

- Concrete actions to avoid

---

**Keywords:** keyword1, keyword2, keyword3, ...
```

Rules:
- `Keywords` line is **required** on every file — use terms a future reader would search for
- No process notes, no meta-commentary, no "this was written because…" — knowledge only
- Target **30–80 lines** per file; split if longer
- If one draft entry contains multiple distinct topics, write one file per topic

## Splitting long files

When a file would exceed ~80 lines, split at a natural boundary. If two or more files share a theme, group them in a subdirectory:

```
knowledge/agent/
  forking.md
  output-handling.md
  compaction-behavior.md
```

Create the directory and update file paths accordingly.

## After processing

1. Verify each promoted file has: type, context, do/don't sections, keywords line
2. Verify no file exceeds ~80 lines (split if needed)
3. Delete the draft entry (or the section within it) that was promoted — git history is the safety net
4. `knowledge/draft/` contains a `.gitkeep` — leave the directory in place; do not remove it

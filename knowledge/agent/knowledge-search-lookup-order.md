# Use knowledge_search Before WebFetch

**Type:** Discovery

## Context

When agents need to look up external or unfamiliar information during a task, the order in which
they consult sources matters significantly for token efficiency and response quality.

## What is true

- `knowledge_search` is cheap and covers project-specific knowledge that training data cannot
  provide (past incidents, non-obvious API behavior, design rationale).
- `WebFetch` fetches raw external content at network cost and often consumes significant tokens
  parsing irrelevant content.
- If the answer already exists in the knowledge base, fetching the web is pure waste.

The recommended lookup order is:

1. `knowledge_search` — project-specific knowledge, past gotchas, design decisions
2. Read local docs/code (`Read` / `Glob` / `Grep`)
3. `WebFetch` — only if the question is still unanswered

## Do

- Run `knowledge_search` first whenever the topic could plausibly be covered by a past note
- Ask "could this already be in the knowledge base?" before any `WebFetch` call
- Follow the three-step order above consistently

## Don't

- Reach for `WebFetch` without checking the knowledge base first
- Skip `knowledge_search` for project-internal topics or past-problem lookups

---

**Keywords:** knowledge_search, WebFetch, lookup order, token efficiency, agent behavior, search strategy

# `retrieve` vs `survey`: Role Boundary

**Type:** Discovery

## Context

Applies whenever an agent needs to find information and must choose between the two
lookup subcommands. The distinction is frequently confused because both feel like
"search" operations. Procedures and skills that direct agents to search should make
this boundary explicit.

## What happened / What is true

The two subcommands target entirely different corpora:

| Command | Target | Nature |
|---------|--------|--------|
| `perclst retrieve` | `knowledge/` | Past findings, curated, stable |
| `perclst survey` | Source code | Current state, live |

- Use **`retrieve`** when looking for a known problem, design decision, or gotcha
  that may have been captured previously.
- Use **`survey`** when the answer requires inspecting the actual codebase as it
  exists right now (symbols, file contents, call sites).

Without this distinction documented, agents conflate the two and either miss cached
knowledge or query stale knowledge for live code questions.

## Do

- Use `retrieve` first for any non-trivial task — check if the answer is already known
- Switch to `survey` (or MCP tools) when the question is about current code state

## Don't

- Don't use `survey` to find past gotchas or design decisions — use `retrieve`
- Don't use `retrieve` to answer "what does this function do right now" — use `survey`

---

**Keywords:** retrieve, survey, knowledge search, codebase exploration, design decision, boundary, subcommand

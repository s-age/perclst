---
name: code-base-survey
description: Codebase investigation methodology and catalog format. Load when surveying the codebase for bug investigation or pre-implementation research.
user-invocable: false
---

# Codebase Survey Skill

## Investigation methodology

### Step 1 — knowledge base first

Always start with `knowledge_search`. Prior decisions, gotchas, and design notes may already answer the question.

```
knowledge_search("<keyword1>")
knowledge_search("<keyword2>")
```

### Step 2 — consult catalogs

Before running any search tools, check the supporting catalog files for fast matches:

- **[utils-catalog.md](utils-catalog.md)** — pure utility functions (date, path, uuid, output, turns, formatInputSummary)
- **[infra-catalog.md](infra-catalog.md)** — I/O adapters (fs, shell, git, claudeCode, tsAnalyzer, ttyInfrastructure, …)
- **[domain-map.md](domain-map.md)** — domain responsibilities and entry files (session, agent, pipeline, checker, …)
- **[mcp-tools-catalog.md](mcp-tools-catalog.md)** — MCP tools available in this project
- **[commands-catalog.md](commands-catalog.md)** — all CLI commands and flags

If a candidate is found in a catalog, jump directly to Step 4.

### Step 3 — locate with Grep / Glob

When catalogs don't yield a match, search the source:

```
Grep("<symbol or keyword>", path="src/")
Glob("src/**/*.ts", pattern="*<name>*")
```

Narrow by layer first (e.g. `src/domains/` for business logic, `src/utils/` for helpers).

### Step 4 — analyse the candidate

Run `ts_analyze` on any candidate file to confirm it contains what is needed:

```
ts_analyze("src/domains/session.ts")
```

### Step 5 — trace usage (if needed)

For bug investigation or blast-radius assessment, follow the call chain:

```
ts_get_references("src/domains/session.ts", "resolveId")
```

Use `ts_get_types` when the exact signature is needed before making a recommendation.

---

## Output format

Always return both sections, even if one is empty.

```
## Where

| Layer | File | Symbol | Note |
|---|---|---|---|
| domains | src/domains/session.ts | SessionDomain.resolveId | accepts name or ID |

## What exists (reuse candidates)

| File | Symbol | Why it fits |
|---|---|---|
| src/utils/uuid.ts | generateId | UUID generation already wrapped |

## Summary

<1–3 sentences: direct answer to the query, what to reuse, or where to add new code if nothing was found>
```

If nothing is found, the Summary must include a suggested layer and file where the feature should be added, based on the architecture rules in the `arch` skill.

---

## Catalog format (for refresh agent)

Each catalog file follows this structure:
- H1 title + one-line purpose
- Freshness note pointing to the source of truth
- One H2 section per file, with a table of exported symbols
- Include: function name, signature (abbreviated), return type, and a one-line note on usage

Keep each catalog under 300 lines. If a layer grows beyond that, split by subdirectory.

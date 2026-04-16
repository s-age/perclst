# knowledge_search Prioritizes the Keywords Field

**Type:** Discovery

## Context

When deciding where `knowledge_search` looks for matches, the tool does not perform
a naive full-text search across entire files. Understanding this changes how you should
write and maintain knowledge files.

## What happened / What is true

- `knowledge_search` searches the `**Keywords:** ...` field at the bottom of each file first
- Only files that lack a `**Keywords:**` line fall back to full-text content search
- Full-text search was intentionally avoided because the Keywords field contains
  human-selected representative terms; mixing it with implementation details (code
  snippets, variable names) found in the body reduces search precision

## Do

- Always include a `**Keywords:** ...` line at the end of every knowledge file
- Choose keywords that a future reader would actually type when searching
  (synonyms, CLI flag names, type names, and related concept terms are all valid)

## Don't

- Omit the Keywords line — without it the tool falls back to full-text search,
  which may surface unintended files and miss intended ones

---

**Keywords:** knowledge_search, mcp tool, keywords field, search, full-text fallback, search priority

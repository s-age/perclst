---
name: meta-knowledge-concierge
description: Search the knowledge base before designing or implementing. Use when starting any non-trivial design or implementation task directly (not via sub-agent).
paths:
  - 'src/**/*.ts'
disable-model-invocation: true
---

Before starting any non-trivial design or implementation task, search the knowledge base for prior decisions, gotchas, and patterns.

## Search strategy

- Call `knowledge_search` once per distinct keyword or topic relevant to the task
- AND/OR syntax is supported: `"keyword1 AND keyword2"`, `"keyword1 OR keyword2"`
- Search broadly first (component or feature name), then narrow (specific function or pattern)
- If working from within a sub-agent session, prefer `perclst retrieve "kw1" "kw2" --output-only` instead

## Output format (when running as retrieve agent)

```
## Knowledge Results

### <topic or keyword>
<concise summary of findings>

**Source:** knowledge/<path>.md

---

### <keyword with no results>
No relevant knowledge found.
```

## When results are found

Incorporate findings before proposing a design — surface any recorded gotchas, prior decisions, or patterns that apply.

## When no results are found

Report explicitly: "No relevant knowledge found for: <keyword>". Do not infer or fabricate.

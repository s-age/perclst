# "N Files Scanned" in Report Summary Triggers Unnecessary Exploration

**Type:** Problem

## Context

Applies to any arch review report template (or similar summary output) that a downstream refactor
or implement agent will read. Discovered by analysing high API-call-count runs of the arch review
→ refactor pipeline.

## What happened / What is true

Including a "N files scanned" count in the report summary caused the refactor agent to treat
those files as relevant and explore each one individually, even when they were irrelevant to
the recommended changes. This inflated API call counts significantly.

## Do

- Omit file scan counts from report summaries
- Include only files directly relevant to a recommendation in that recommendation's section

## Don't

- Add "X files scanned" or "reviewed N files" to the summary section of any arch report
- List all analysed files in the report — the downstream agent will explore every listed file

---

**Keywords:** arch review, report template, file count, agent exploration, API calls, refactor agent, pipeline, summary

# Numbered Recommendation Steps Cause ts_checker to Run After Each Edit

**Type:** Problem

## Context

Applies when writing the recommendations section of an arch review report template. Relevant
whenever a downstream refactor agent reads a structured list of changes to apply. Discovered by
analysing high API-call-count runs of the arch review → refactor pipeline.

## What happened / What is true

Numbered recommendation steps (e.g. "1. Add X, 2. Remove Y, 3. Update Z") caused the refactor
agent to treat each step as a complete task. After each numbered edit it ran `ts_checker`,
multiplying verification calls by the number of steps. The template now ends with an explicit
instruction to prevent this.

## Do

- End the recommendations section with: "Apply all changes first. Run ts_checker once only after
  all edits are complete."
- Use bullet points for individual changes when they are part of a single logical task

## Don't

- Present multi-part changes as a numbered list without the explicit "apply all first" note
- Imply each numbered item is independently verifiable — the agent will verify each one

---

**Keywords:** arch review, report template, numbered steps, ts_checker, refactor agent, API calls, pipeline, recommendations

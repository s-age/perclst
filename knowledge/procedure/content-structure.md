# Procedure File Content Structure

**Type:** Discovery

## Context

Applies to every file under `procedures/`. Procedure files are system prompts that define the
behaviour of a named agent. They are distinct from skills, which contain implementation detail.

## What happened / What is true

- Procedure files define **what** an agent does, never **how**.
- How-level detail belongs in skills; skills are injected at runtime via `Consult the <skill> skill`.
- Every procedure uses exactly one Mermaid flowchart as its primary structural element.
- If a flowchart node describes an implementation step (a *how*), it must be removed and replaced
  with a `Consult the <skill> skill` line at the bottom of the file.

## Do

- Keep procedure files focused on outcomes and decision logic only.
- Express agent logic as a Mermaid flowchart.
- Delegate implementation steps to skills and reference them with `Consult the <skill> skill`.

## Don't

- Don't embed implementation detail (command invocations, file paths, API calls) directly in the
  flowchart or prose of a procedure file.
- Don't add more than one flowchart per procedure file.

---

**Keywords:** procedure, what-only rule, flowchart, mermaid, skills, system prompt, agent behavior

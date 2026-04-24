# Skill vs Procedure: How vs What

**Type:** Discovery

## Context

Applies whenever adding new automation to the perclst agent system. Understanding
this separation prevents procedure files from bloating with implementation detail and
keeps skills reusable across multiple workflows.

## What happened / What is true

Skills and procedures serve explicitly distinct roles in this system:

- **Skill** = **How** — captures methodology, approach, and output format.
  An agent reads a skill to know *how to do* something (e.g. how to classify
  findings, how to format a report).
- **Procedure** = **What** — defines the agent's goal and decision flow.
  A procedure tells the agent *what to accomplish* (e.g. inspect a diff, promote
  draft entries).

The same skill can serve multiple procedures. Procedures stay lean (What-only
flowcharts) while operational detail lives in skills.

**Concrete example — `inspect` subcommand:**

- `procedures/code-inspect/inspect.md` — What: read diff → review → check sensitive data → report
- `.claude/skills/code-inspect/SKILL.md` — How: severity labels, detection patterns,
  report format

Without this separation, procedures accumulate How detail, become brittle, and cannot
be reused. Stripping How out of procedures allows:
- Reuse of the same inspection methodology across different workflows
- Format changes in one place (the skill) without touching procedures
- Procedures that are readable as pure decision flows

## Do

- Put methodology, formats, and detection patterns in a skill file
- Keep procedure files as flowcharts / decision trees that reference skills
- When unsure where detail belongs, ask: "Is this *what to do* or *how to do it*?"

## Don't

- Don't embed classification rules, report formats, or heuristics directly in a procedure
- Don't duplicate How detail between a procedure and a skill

---

**Keywords:** skill, procedure, design principle, separation of concerns, how vs what, reuse, code-inspect

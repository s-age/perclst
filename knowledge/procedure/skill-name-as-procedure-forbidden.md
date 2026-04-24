# Procedure Names Must Not Reuse Skill Names

**Type:** Discovery

## Context

Applies whenever creating or renaming a file under `procedures/`. Arises most often when a
procedure is tightly coupled to a single skill — it is tempting to name the procedure after
the skill, but this is incorrect.

## What happened / What is true

Procedure names express **what the agent does** (a verb-phrase goal), not **what skill the
agent uses**. Reusing a skill name as a procedure name conflates two separate concepts:

- **Skill** = HOW — a methodology or knowledge library consulted at runtime via
  `Consult the <skill> skill`.
- **Procedure** = WHAT — a goal-and-decision definition that may invoke one or more skills.

A procedure named after its skill reads as "what tool to use" rather than "what to accomplish",
which is misleading and breaks discoverability.

| Verdict | Example |
|---------|---------|
| ✅ Good | `meta-librarian/curate.md`, `meta-pipeline-creator/create.md` |
| ❌ Bad | `meta-librarian.md` (skill name), `meta-pipeline-creator.md` (skill name) |

## Do

- Name procedures with a verb phrase that describes the agent's goal.
- Pick a name that answers "what will the agent accomplish?" not "which skill does it call?"

## Don't

- Don't name a procedure after the skill it uses, even if there is a 1-to-1 correspondence.
- Don't use noun-first names or skill identifiers as procedure filenames.

---

**Keywords:** procedure, naming, skill name, reuse, verb phrase, goal, what vs how, convention

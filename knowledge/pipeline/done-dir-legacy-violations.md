# done/ Pipelines Contain Known SKILL.md Violations

**Type:** Problem

## Context

Several pipelines archived in `pipelines/done/` predate the current SKILL.md rules
and break structural conventions. They exist as historical records only. The
authoritative structural reference is `examples/`, not `done/`.

## What happened

Two specific violations appear in done/ pipelines:

1. **Commit task inside the nested pipeline** — commit should always be placed
   outside the pipeline block so it runs once after all loop iterations complete.

2. **Reviewer name is split** — done/ files use `initial-reviewer` and
   `loop-reviewer` as separate agent names. SKILL.md requires both to share the
   same name so the pipeline runner can resume the existing session on the review
   step of each loop iteration.

## Do

- Use `examples/` as the structural reference when creating or reviewing pipelines
- Verify that commit tasks are outside any nested pipeline block
- Use a single reviewer name consistently across initial and looped review agents

## Don't

- Don't copy the structure of files in `done/` as a template for new pipelines
- Don't assume a pipeline in `done/` demonstrates correct SKILL.md patterns —
  it may reflect conventions that have since been superseded

---

**Keywords:** done directory, SKILL.md violations, commit task placement, reviewer name, session resume, structural template, examples, legacy pipelines

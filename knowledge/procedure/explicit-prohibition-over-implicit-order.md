# Explicit Prohibitions Beat Implicit Ordering in Procedure Steps

**Type:** Discovery

## Context

Applies to any `procedures/*.md` or `SKILL.md` that defines a multi-step workflow
where step ordering matters — especially when a step must never be skipped or
executed out of sequence relative to another.

## What happened / What is true

A procedure described the correct tool-usage order (call `ts_analyze` first, then
`Read` only when needed). Despite this, a reviewer agent read files before calling
`ts_analyze` — defaulting to its habitual "read the file" pattern.

Implicit sequential ordering (A → B → C in a flowchart) is not equivalent to a
prohibition on doing B before A. Agents treat flowchart order as the happy path,
not as a hard constraint.

The fix: add a direct prohibition inside the step node where the violation would occur:
> "Do NOT Read any file before ts_analyze has been called on it"

## Do

- State explicit "Do NOT" rules at the step where a violation would naturally occur
- Treat implicit ordering in flowcharts as description of the happy path only
- Repeat the prohibition at the point of risk, not only in a preamble

## Don't

- Rely on flowchart sequence alone to enforce mandatory ordering
- Assume agents will infer hard constraints from the order steps are listed
- Place a prohibition only in a summary section far from where it applies

---

**Keywords:** procedure, prohibition, ordering, constraint, agent behavior, Do NOT, flowchart, implicit, explicit, ts_analyze, step sequencing

# Mermaid Flowcharts Are Control Mechanisms, Not Documentation

**Type:** Discovery

## Context

Applies to any `SKILL.md` or `procedures/*.md` file that contains a Mermaid flowchart
with decision nodes (`{...}`). These are strong-edge controls that govern AI behavior
at runtime, not illustrative diagrams for human readers.

## What happened / What is true

When optimizing `meta-procedure-creator/SKILL.md`, the flowchart was replaced with
numbered steps for brevity. This was reverted — flowcharts must be preserved.

AI reasoning is probabilistic. Flowcharts with strong edges (mandatory decision nodes)
and weak edges (optional/recommended paths) convert that probabilistic behavior into
deterministic output:

- A numbered list cannot replicate a flowchart: it lacks branching logic and cycle-back paths
- Decision nodes (`{...}`) enforce mandatory branch evaluation — prose cannot do this
- Cycle-back paths force re-entry on failure; linear steps do not
- The flowchart IS the operating template Claude follows — removing it degrades control

**Source:** https://qiita.com/s-age/items/40beac2952958468b8fb

## Do

- Preserve all Mermaid flowcharts in `SKILL.md` and `procedures/*.md` files exactly as written
- Treat decision nodes (`{...}`) as mandatory — they define required branching, not suggestions
- Add new decision nodes when a step genuinely requires a conditional branch

## Don't

- Replace a Mermaid flowchart with prose, numbered steps, or bullet lists
- Treat flowcharts as optional decoration that can be removed for brevity
- Simplify away cycle-back edges (the `Fix → Verify` loop pattern is intentional)

---

**Keywords:** flowchart, mermaid, control flow, skill, procedure, decision node, deterministic, AI behavior, SKILL.md

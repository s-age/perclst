# Architecture Violations Are Classified as CRITICAL in Code Inspection

**Type:** Discovery

## Context

Applies to the `code-inspect/inspect` procedure and `code-inspect` skill when classifying
findings from a diff review. Sets the precedent for how to calibrate severity on any
new inspection category added in the future.

## What happened / What is true

Cross-layer import violations (e.g. a `cli` layer importing directly from
`repositories`) are classified as **CRITICAL** (push-blocking), not `WARNING`.

**Rationale:**
- Architecture violations compile silently but cause cascading refactors downstream
- The longer they stay, the harder they are to remove
- Treating them as `WARNING` would let them slip through on "I'll fix it later" logic
- They are structurally different from point-in-time artifacts (debug logs, temp files)
  that don't compound over time

**Classification heuristic for new categories:**

> Does this issue compound over time if left unresolved?
> - Yes → CRITICAL
> - No (point-in-time artifact, doesn't spread) → WARNING

## Do

- Mark any cross-layer import as CRITICAL in code inspection output
- Apply the compounding test when adding new inspection categories

## Don't

- Don't downgrade architecture violations to WARNING to reduce noise
- Don't treat "it compiles" as evidence of correctness for import paths

---

**Keywords:** architecture violation, CRITICAL, severity, code-inspect, cross-layer import, warning, classification

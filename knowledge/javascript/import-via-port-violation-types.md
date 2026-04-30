# import-via-port Rule: Two Distinct Violation Types

**Type:** Discovery

## Context

The custom ESLint rule `eslint-rules/import-via-port.js` enforces layer-boundary import discipline. Understanding its two violation categories is required to produce correct error messages and fixes.

## What happened / What is true

Cross-layer import violations fall into two fundamentally different categories:

### 1. `usePort` — Route through the port, not the implementation

The import direction is allowed, but the importer must reference the port type rather than the concrete implementation.

- Example: `services → @src/domains/session` is wrong; use `@src/domains/ports/session` instead.

### 2. `forbiddenLayer` — The import itself is prohibited

Even routing through a port does not fix the violation. The importer must restructure to use an intermediate layer.

- `services → @src/repositories/*` → must go through `domains`
- `cli → @src/repositories/*` → must go through `services`
- `mcp → @src/domains/*` → must go through `services`

A single heuristic (comparing layer-order values) cannot distinguish these two cases. The rule must derive a **forbidden map** and a **portRequired map** explicitly from `layers.md` and report them with separate messages.

## Do

- Define `forbiddenLayerMap` and `portRequiredMap` explicitly from the layer allowlist in `layers.md`
- Report each violation with a message that names the correct remediation path (re-route vs. use port)

## Don't

- Don't rely solely on numeric layer-order comparison — it conflates the two violation types
- Don't emit a generic "use port" message for violations where the import layer itself is forbidden

---

**Keywords:** import-via-port, ESLint rule, layer boundary, forbidden import, port pattern, cross-layer, eslint-rules

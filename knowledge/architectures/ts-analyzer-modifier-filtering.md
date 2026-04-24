# TsAnalyzer: Keep Modifier Filtering in the Infra Layer

**Type:** Discovery

## Context

When extending `TsAnalyzer.extractSymbols()` or similar ts-morph-based tools, there is a temptation to move visibility-modifier filtering (e.g. skipping `private`/`protected` methods) into the domain layer to "keep infra dumb." This note explains why that move is premature.

## What happened / What is true

- `extractSymbols()` filters class members by `PrivateKeyword` / `ProtectedKeyword` via `hasModifier(SyntaxKind.PrivateKeyword)`.
- This looks like a business rule ("only expose public API") but is structurally just reading an AST property — no interpretation or calculation.
- Contrast with the `testStrategy` split:
  - **Infra** returns raw numbers: `branchCount`, `loopCount`, etc.
  - **Domain** owns the formula: `complexity = 1 + branchCount + loopCount + ...`
- `ts_analyze` currently has no domain-level formula equivalent, so there is no natural home for the filtering logic in the domain layer.
- Moving it to the domain layer would require introducing a new "raw symbol" type, adding complexity without a concrete benefit.
- The right trigger to revisit: a requirement such as "allow configuring which visibility levels to include" — at that point a domain rule exists and the raw type becomes necessary.

## Do

- Keep modifier filtering (`PrivateKeyword`, `ProtectedKeyword`) inside the infra layer (`TsAnalyzer`) until a genuine domain rule justifies the split.
- Before moving any filter logic to domain, ask: "Do I need a raw (unfiltered) type to make this work?" If not, leave it in infra.

## Don't

- Don't move infra filtering to domain preemptively just because it resembles a business rule.
- Don't introduce raw intermediate types unless a domain calculation actually consumes them.

---

**Keywords:** ts-morph, TsAnalyzer, extractSymbols, infra, domain, modifier filtering, PrivateKeyword, ProtectedKeyword, architecture, layer separation

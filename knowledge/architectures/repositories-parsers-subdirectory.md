# repositories/parsers/ Subdirectory Convention

**Type:** Discovery

## Context

When a repository file grows past the max-lines limit (300 lines), splitting raw type
definitions and JSONL parsing logic into separate files is the natural next step.
Placing those helpers directly under `repositories/` makes them look like sibling
repositories, which appears to violate the `arch-repositories` prohibition on
cross-repository imports.

## What happened / What is true

- `claudeSessions.ts` exceeded 300 lines, requiring a split.
- Extracted raw type definitions and JSONL parsing helpers needed a home inside the
  `repositories/` layer without conflicting with arch-layer import rules.
- The chosen solution is a `repositories/parsers/` subdirectory — mirroring the same
  convention used by `ports/` for port contracts.
- Files under `parsers/` are clearly implementation details, not repositories; the
  name removes ambiguity.
- Imports from `repositories/parsers/` are treated as **intra-layer** and are
  therefore permitted (noted in `arch-repositories` SKILL.md).

## Do

- Put format-specific type definitions and conversion logic in `repositories/parsers/`
  when splitting an oversized repository file.
- Treat `repositories/parsers` imports as intra-layer — no special exemption needed.
- Document any new intra-layer allowance in the relevant arch skill/SKILL.md.

## Don't

- Don't place shared general utilities in `repositories/parsers/` — use `utils/` instead.
- Don't put domain-knowledge-bearing logic there — use `domains/` instead.
- Don't place parser helpers directly under `repositories/` (makes them look like
  sibling repositories and triggers false arch violations).

---

**Keywords:** repositories, parsers, subdirectory, arch-repositories, intra-layer, split, max-lines, JSONL, type definitions

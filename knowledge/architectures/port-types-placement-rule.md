# Port Types Must Not Live in src/types/

**Type:** Discovery

## Context

Applies when deciding where to place a port interface (`IXxx`) that defines a boundary between
layers. Reviewers or LLMs sometimes suggest `src/types/claudeCode.ts` — this is incorrect.

## What is true

- `src/types/` is **not** a home for port interfaces.
- Port interfaces belong in the layer that **owns** the boundary:
  - Repository ports → `repositories/ports/`
  - Domain ports → `domains/ports/`
- This is enforced by the `arch-types` skill.

## Why it matters

Placing ports in `src/types/` creates a shared-globals dumping ground, breaks the layered
dependency model, and causes import-direction violations when other layers need to reference the
interface.

## Do

- Put repository-boundary interfaces in `repositories/ports/`.
- Put domain-boundary interfaces in `domains/ports/`.
- Use `Infras['<member>']` from `core/di` when you need an infrastructure type in a CLI test
  (see `cli-infra-stub-type-import.md`).

## Don't

- Don't create `src/types/<anything>.ts` to hold port/interface types.
- Don't follow review suggestions that propose extracting a port to `src/types/` — this violates
  `arch-types`.

---

**Keywords:** port type, IXxx interface, src/types, arch-types, repositories/ports, domains/ports, layer boundaries

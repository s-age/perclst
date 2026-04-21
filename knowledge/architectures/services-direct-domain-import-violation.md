# Services Layer Must Not Import Directly from Domain Implementation Files

**Type:** Problem

## Context

Applies whenever a service in `src/services/` needs a utility function or logic that lives inside
`src/domains/` (e.g. `domains/turns.ts`). The layered architecture only allows services to touch
`domains/ports` — importing any other file under `domains/` is a violation.

## What happened / What is true

`analyzeService.ts` imported `flattenTurns` / `applyRowFilter` directly from `@src/domains/turns`.
The `services` layer is permitted to import from `domains/ports` only; importing domain
implementation files bypasses the port abstraction and couples layers illegally.

The fix is one of two options:

- **Move the function to `src/utils/`** — `services → utils` is a legal import. Appropriate for
  pure functions with no I/O or side effects.
- **Expose it through a domain port** — Add a method to the relevant `IXxxDomain` interface and
  implement it in the domain class. The service calls `this.domain.xxx()` instead of reaching into
  the implementation file.

In this case the second option was chosen: `formatTurns` was added to `IAnalyzeDomain` and
implemented in `AnalyzeDomain`.

## Do

- Place pure, domain-agnostic helpers in `src/utils/` so services can import them legally.
- Expose domain logic to services via `domains/ports` interface methods only.
- Choose between `utils/` vs port-method by asking: "does this concept belong to the domain model?"
  If yes → port method. If no → `utils/`.

## Don't

- Import from `src/domains/<impl-file>.ts` directly in a service.
- Treat "it's just a pure function" as justification for crossing layer boundaries.
- Use `vi.mock('@src/domains/<impl-file>', ...)` in service tests — needing that mock is a signal
  the boundary is already broken.

---

**Keywords:** services, domains, import, layer violation, architecture, ports, utils, pure function, IAnalyzeDomain

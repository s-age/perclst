# Layer Responsibility Separation: I/O vs Business Logic

**Type:** Discovery

## Context

Code that spans multiple layers (repository, domain, infrastructure) can easily mix concerns. When a repository function both performs I/O and makes business decisions, it becomes hard to test the logic without mocking filesystem operations, and it violates the layering model.

## What happened / What is true

TestStrategyRepository's `detectFramework(path)` was doing two things:
- I/O: searching up the directory tree to find and read `package.json`
- Logic: deciding test framework by checking if `vitest` exists in dependencies

This violates the layer boundary. Repositories should be I/O gateways; domains should contain business logic.

The split:
- **Repository**: `readPackageDeps(path)` returns `Record<string, string> | null` — pure I/O, delegates filesystem access
- **Domain**: `detectFramework(deps)` takes pre-read deps, returns `TestFramework` — pure logic, no I/O

## Do

- Ask: "Does this function need file I/O?" If no, move it to the layer above (domain)
- Have repositories return raw data (objects, arrays, primitives), not business-logic results
- Let domains make decisions using repository-provided data
- Inject dependencies into repository constructors for testability

## Don't

- Mix I/O and decision logic in the same function
- Have repositories return domain-specific enums (e.g., `TestFramework`) — return primitives instead
- Mock the filesystem when you're trying to test business logic (signal to refactor)

---

**Keywords:** layers, repository, domain, responsibility, I/O, separation of concerns, architecture

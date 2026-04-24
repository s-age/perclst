# Cross-Layer Integration Tests Are Impossible Under Strict Layer Architecture

**Type:** Discovery

## Context

Applies to the layered architecture (`cli` / `validators` / `services` / `domains` / `repositories` / `infrastructures`). Each layer's `__tests__/` directory is subject to the same import rules as its parent layer. This makes it structurally impossible to write a single test that requires concrete classes from two non-adjacent layers.

## What happened / What is true

- A test instantiating both `PipelineDomain` (domains concrete) and `PipelineService` (services concrete) has no legal home:
  - `services/__tests__/` cannot import `domains` concrete classes or `repositories/ports`.
  - `domains/__tests__/` cannot import `services`.
- Extracting shared construction into a helper file does not help — the helper is still bound by its parent layer's import rules.
- The original bug (`done` flag / retry interaction) was not caused by mocking itself, but by `onTaskDone` being a no-op `vi.fn()`. Functional mocks that replicate the callback's mutation (`done = true`) catch the same class of bugs without violating layer boundaries.

## Do

- Use interface-level mocks (e.g., `IPipelineDomain`) with functional stubs that replicate real callback side effects.
- Ensure mocked callbacks return real result types (`RejectionResult`, not `undefined`) so interaction bugs surface.
- Test each layer in isolation; rely on interface contracts across layer boundaries.

## Don't

- Don't attempt a single test that instantiates concrete classes from two non-adjacent layers — no valid location exists.
- Don't use no-op `vi.fn()` for callbacks that mutate shared state; behavioral gaps between mock and reality hide bugs.

---

**Keywords:** cross-layer, integration test, layer architecture, PipelineDomain, PipelineService, import rules, functional mock, vi.fn, IPipelineDomain, testing constraints, architecture

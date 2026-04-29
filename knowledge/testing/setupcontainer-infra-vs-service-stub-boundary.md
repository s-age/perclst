# setupContainer: infras vs services stub boundary

**Type:** Discovery

## Context

When writing integration tests using `setupContainer`, stubs can be injected at two levels: `infras` (infrastructure layer) or `services` (service layer). The choice silently determines how much real production code runs during the test.

## What is true

- `setupContainer({ infras: {...} })` stubs only I/O adapters, allowing the full Service → Domain → Repository chain to execute. This is the correct default.
- `setupContainer({ services: {...} })` bypasses domain and repository layers entirely — only the code above the service boundary runs.
- Mocking at the service layer was the root cause of repositories sitting at ~68% coverage. The existing tests were not missing cases; they were mocking too high in the stack.
- Switching from service-level to infra-level stubs brought overall coverage from ~62% to 91% without adding proportionally more test cases — the same tests simply exercised more real code.

## Do

- Default to `infras` stubs in all integration tests.
- Use `services` stubs only when infra-stubbing is infeasible: e.g., `GitInfra` requires a real git repo and the test uses a temp directory, or the error condition is unreachable through any infra stub.

## Don't

- Use `services` stubs as a shortcut — the skipped Service → Domain → Repository path creates invisible coverage gaps.
- Infer that a large number of integration tests implies high coverage; stub level matters more than test count.

---

**Keywords:** setupContainer, infras, services, stub boundary, integration test, coverage, DI container, service layer, repository layer

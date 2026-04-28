# MCP Integration Tests: Stub at Service Layer, Not Infrastructure

**Type:** Discovery

## Context

When an MCP tool integration test (in `src/mcp/tools/__tests__/integration/`) needs to mock a
dependency, the stub must go at the **service layer**. Stubbing at the infrastructure layer
violates architecture rules and couples tests to implementation details.

## What is true

The `mcp` layer cannot import from `infrastructures/`, even as `type`-only. TypeScript's type
erasure is a compilation detail, not an architectural exemption — the import itself is the
violation.

Stubbing at the infra layer also couples the test to every layer below the service
(domain → repo → infra). If the service changes its infrastructure provider, the test breaks for
structural reasons unrelated to the tool's actual behaviour.

**Correct pattern:**
```ts
import { setupContainer, type Services } from '@src/core/di/setup'

const mockCheckerService: Services['checkerService'] = {
  check: vi.fn().mockResolvedValue({ ok: true })
} as unknown as Services['checkerService']

setupContainer({ config: buildTestConfig(dir), services: { checkerService: mockCheckerService } })
```

**Wrong pattern:**
```ts
import type { CommandRunnerInfra } from '@src/infrastructures/commandRunner'
setupContainer({ config, infras: { commandRunnerInfra: stub } })  // ❌ layer violation
```

An MCP integration test verifies that the tool wires correctly to its service: correct
serialization to `content[]` and correct forwarding of snake_case args as camelCase options.
It should not verify how the service implements its logic — that belongs in domain/repo unit tests.

Type service mocks via `Services['serviceName']` from `@src/core/di/setup`. Never import the
service class directly just to get its type.

## Do

- Stub at the service layer using `setupContainer({ ..., services: { ... } })`
- Type service mocks as `Services['serviceName']` from `@src/core/di/setup`

## Don't

- Don't import from `src/infrastructures/` in `src/mcp/` tests — even as `type`-only
- Don't pass `infras` overrides in MCP tool integration tests

---

**Keywords:** MCP integration test, service layer stub, layer violation, type import, setupContainer, Services type, infras override

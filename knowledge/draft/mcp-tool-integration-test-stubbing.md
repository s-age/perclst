# MCP tool integration tests must stub at service layer

When writing integration tests for MCP tools (in `src/mcp/tools/__tests__/integration/`), stub dependencies at the **service layer**, not the infrastructure layer.

## Pattern: Correct

```ts
import { setupContainer, type Services } from '@src/core/di/setup'

let mockCheckerService: Services['checkerService']

beforeEach(() => {
  mockCheckerService = {
    check: vi.fn().mockResolvedValue({ ok: true, ... })
  } as unknown as Services['checkerService']
  
  setupContainer({
    config: buildTestConfig(dir),
    services: { checkerService: mockCheckerService }
  })
})
```

## Pattern: Incorrect ❌

```ts
import type { CommandRunnerInfra } from '@src/infrastructures/commandRunner'

let commandRunnerStub: CommandRunnerInfra

setupContainer({
  config: buildTestConfig(dir),
  infras: { commandRunnerInfra: commandRunnerStub }  // ❌ wrong layer
})
```

## Why

1. **Layer violation**: `mcp` layer cannot import from `infrastructures/`, even as `type`-only. This is categorical — TypeScript's type erasure is a compilation detail, not an architectural exemption.

2. **Coupling**: Stubbing at infra level couples the test to every layer below the service (domains → repositories → infrastructures). If the service implementation changes infrastructure providers, the test breaks for a structural reason unrelated to the tool's actual behaviour.

3. **Test responsibility**: An MCP integration test verifies that the tool **wires correctly to its service**. It should:
   - Verify the tool serializes service output into `content[]` responses
   - Verify the tool forwards snake_case MCP args as camelCase service options
   - Not verify how the service implements its logic (that's domain/repo unit tests)

## Type annotation: Services

Access service types via `Services['serviceName']` from `@src/core/di/setup`:

```ts
import { setupContainer, type Services } from '@src/core/di/setup'

const mockService: Services['checkerService'] = { ... }
```

Never import the service class directly just to get its type.

## Keywords
integration test, mcp, service-layer stub, layer violation, type import

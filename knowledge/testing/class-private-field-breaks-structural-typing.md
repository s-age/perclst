# Class Private Fields Break Structural Typing in Tests

**Type:** Problem

## Context

When writing unit tests that mock a service class, TypeScript's structural typing normally lets you pass a plain object that matches the public API. However, if the real class has a TypeScript `private` field, structural compatibility breaks and the mock cannot be assigned to the class type.

## What happened / What is true

- `PermissionPipeService` has a `private domain` field.
- A `MockService` that mirrors only the public members is **not** structurally assignable to `PermissionPipeService`, even though no test code needs `domain`.
- Error: `Argument of type 'MockService' is not assignable to parameter of type 'PermissionPipeService'`.
- TypeScript uses nominal-like checking for classes with private fields: the private field must originate from the same declaration.

## Do

- Use an intersection type + double cast in the test factory:

```typescript
import type { PermissionPipeService } from '@src/services/permissionPipeService.js'

type MockService = {
  pollRequest: Mock<() => PermissionRequest | null>
  respond: Mock<() => void>
  askPermission: Mock<() => Promise<unknown>>
}

const makeService = (): MockService & PermissionPipeService =>
  ({
    pollRequest: vi.fn<() => PermissionRequest | null>(),
    respond: vi.fn<() => void>(),
    askPermission: vi.fn<() => Promise<unknown>>()
  }) as unknown as MockService & PermissionPipeService
```

- Declare **all** public members of the real class in `MockService` — omitting any will cause type errors when accessing `.mock` or other mock properties later.

## Don't

- Don't use `as unknown as RealService` alone without the intersection — you lose mock-specific types (`mock`, `mockReturnValue`, etc.).
- Don't use `as unknown as T` double casts in production code — this pattern is test-only.

---

**Keywords:** TypeScript, private field, structural typing, mock, unit test, intersection type, double cast, as unknown, PermissionPipeService, vitest

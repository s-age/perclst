# Vitest: Type Mock Services as `{ method: ReturnType<typeof vi.fn> }` to Avoid `as any`

**Type:** Discovery

## Context

Applies when writing Vitest unit tests that mock a service injected via a DI container. Choosing
how to type the mock variable determines whether you need repeated `as any` casts on every
`.mockResolvedValue()` / `.mockReturnValue()` call.

## What happened / What is true

- Typing a mock as `Partial<RealService>` preserves the original return type of each method.
  TypeScript does not know the property is a `vi.fn()`, so it rejects mock-specific methods
  without an `as any` cast on every call.
- Declaring the mock with an explicit `vi.fn()` return type gives TypeScript full knowledge of
  the mock shape, eliminating per-call casts. One `as unknown as RealService` cast at setup time
  is the only cast needed.

```ts
// BEFORE — cast needed on every assertion / setup call
let mockService: Partial<PermissionPipeService>
(mockService.askPermission as any).mockResolvedValue(result)

// AFTER — no per-call cast
let mockService: { askPermission: ReturnType<typeof vi.fn> }
mockService = { askPermission: vi.fn() }
vi.mocked(container.resolve).mockReturnValue(mockService as unknown as PermissionPipeService)
mockService.askPermission.mockResolvedValue(result)  // no cast needed
```

## Do

- Declare mock service variables as `{ methodName: ReturnType<typeof vi.fn> }`.
- Use a single `as unknown as RealService` cast when passing the mock to `container.resolve`.
- Assign fresh `vi.fn()` instances in `beforeEach` to reset state between tests.

## Don't

- Don't type mock services as `Partial<RealService>` — it forces `as any` on every mock call.
- Don't omit the `ReturnType<typeof vi.fn>` wrapper and rely on inference; the inferred type
  won't carry mock-specific methods.

---

**Keywords:** vitest, mock typing, vi.fn, ReturnType, Partial, as any, service mock, DI container, TypeScript, mock setup

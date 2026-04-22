# Vitest Mock Typing to Avoid Explicit Any

**Type:** Problem

## Context

When testing domain/service classes that depend on repository interfaces, typing mock functions becomes verbose. Using `as any` on `vi.fn()` triggers `@typescript-eslint/no-explicit-any` linting errors, forcing a linter disable comment.

## What happened / What is true

- `const mockRepo = vi.fn(() => []) as any` triggers eslint error: "Unexpected any"
- `vi.fn()` returns `Mock<any, any[]>` by default, which requires explicit typing when used with strict type checking
- Properly typed mocks require the full function signature wrapped in `ReturnType<typeof vi.fn<...>>`
- Declaring mock types upfront in `beforeEach()` is clearer than adding eslint-disable comments

## Do

- Declare mock types explicitly before initialization:
  ```typescript
  let mockRepo: ReturnType<typeof vi.fn<(id: string) => Promise<User | null>, void>>
  
  beforeEach(() => {
    mockRepo = vi.fn(async (id) => ({ id, name: 'Test' }))
  })
  ```
- Configure behavior per-test using `mockResolvedValue()` or `mockImplementation()`
- Extract mock declaration into a typed variable at the top of `beforeEach()`

## Don't

- Use `as any` casts on `vi.fn()` (triggers linter, unclear intent)
- Add `// eslint-disable-next-line` comments to suppress the warning
- Cast to generic `any` type when the actual function signature is known

---

**Keywords:** vitest, mocking, typing, no-explicit-any, ReturnType, beforeEach, mock configuration

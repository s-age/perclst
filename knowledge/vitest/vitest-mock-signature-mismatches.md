# Vitest mock signature mismatches when refactoring function parameters

**Type:** Problem

## Context

When refactoring a function's signature—especially grouping multiple parameters into objects—tests with mocks can fail mysteriously if the mock's type signature and implementation aren't both updated to match the new signature.

## What happened

Test mock type signatures were updated but implementations still used the old signature. The mock would receive grouped objects but destructure them as if they were separate parameters, causing fields to be undefined or malformed:

```
expected { taskIndex: {...}, taskPath: {} } to match { taskIndex: 0, taskPath: [0] }
```

When the result was spread with `...result`, malformed fields contaminated the output object.

## Do

- Update both the mock **type signature** and the **implementation** simultaneously
- Destructure grouped parameters in the mock implementation to match the new function signature
- Test the refactored function with the mock immediately after updating

```typescript
// ✅ Correct - type and implementation match
mockFn: vi.fn<
  [AgentPipelineTask, { index: number; taskPath: number[] }, object, object?],
  Promise<AgentTaskResult>
>()

vi.mocked(mockFn).mockImplementation(
  async (task, taskLocation) => {
    return stubAgentResult({
      taskIndex: taskLocation.index,
      taskPath: taskLocation.taskPath
    })
  }
)
```

## Don't

- Update only the type signature without updating the implementation
- Assume the old destructuring pattern will work with the new grouped parameters
- Rely on IDE type hints alone—run the tests after refactoring

---

**Keywords:** vitest, mocks, parameter-grouping, refactoring, type-signature

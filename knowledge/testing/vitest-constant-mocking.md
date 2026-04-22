# Never Mock Constants in Vitest

**Type:** Problem

## Context

When testing code that uses DI tokens, configuration constants, or other setup values, it's tempting to mock them with `vi.mock()`. This breaks test verification because it prevents catching mismatches between test mocks and production reality.

## What happened / What is true

Constants like `TOKENS` have no side effects or dependencies. They are pure configuration. Mocking them means:

- The test uses a mocked version of the constant
- The code under test uses the same mocked version
- If the real constant changes in production (e.g., a typo or identifier rename), the test won't catch it—both test and code use the same mock

Example of the problem:
```typescript
// ❌ BAD: TOKENS is mocked
vi.mock('@src/core/di/identifiers')
expect(container.resolve).toHaveBeenCalledWith(TOKENS.PipelineFileService)
// If real code has TOKENS.PipelineService (typo), this test still passes
```

## Do

- Import constants normally without mocking
- Mock only behavior (services, validators, utilities) that have dependencies or side effects
- Let tests verify code uses the **actual real** token identifiers from the DI system

```typescript
// ✅ CORRECT: Real TOKENS import
import { TOKENS } from '@src/core/di/identifiers'

vi.mock('@src/core/di/container')

expect(container.resolve).toHaveBeenCalledWith(TOKENS.PipelineFileService)
// Now verifies against the real token
```

## Don't

- Mock configuration objects, constants, or pure values
- Assume mocking constants is "safer"—it's the opposite; it hides mismatches

---

**Keywords:** vitest, mocking, constants, DI tokens, configuration, test isolation

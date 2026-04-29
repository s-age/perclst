# vi.resetModules() + Dynamic Import Breaks instanceof Checks

**Type:** Problem

## Context

Applies to Vitest tests that combine `vi.resetModules()` in `beforeEach` with dynamic `import()` and `vi.doMock()` to swap module implementations per test. Classes shared between a static import in the test file and the dynamically re-imported module under test lose identity.

## What happened / What is true

`vi.resetModules()` clears the module registry. The next dynamic `import()` loads a **fresh** copy of the module — including any class it references (e.g. `UserCancelledError`). The test file's static import still holds the **old** copy. Because they are different object references, `instanceof` always evaluates to `false`.

```typescript
import { UserCancelledError } from '@src/errors/userCancelledError' // old copy

beforeEach(() => { vi.resetModules() })

it('throws', async () => {
  vi.doMock('readline', () => ({ createInterface: ... }))
  const { handleWorkingDirMismatch } = await import('@src/cli/prompt') // new copy
  // UserCancelledError from new copy !== UserCancelledError from static import
  await expect(handleWorkingDirMismatch('/other')).rejects.toThrow(UserCancelledError) // always fails
})
```

## Do

- Declare mocks with `vi.mock()` at the **top level** of the test file (hoisted by Vitest)
- Control mock behavior per test via `vi.mocked()` + `mockReturnValue` / `mockImplementation`
- Use `vi.clearAllMocks()` in `beforeEach` to reset call history without re-registering modules

```typescript
import * as readline from 'readline'
import { handleWorkingDirMismatch } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'

vi.mock('readline')

beforeEach(() => { vi.clearAllMocks() })

it('throws', async () => {
  vi.mocked(readline.createInterface).mockReturnValue({
    question: (_: string, cb: (a: string) => void): void => cb('n'),
    close: vi.fn(),
  } as unknown as readline.Interface)
  await expect(handleWorkingDirMismatch('/other')).rejects.toThrow(UserCancelledError)
})
```

## Don't

- Don't combine `vi.resetModules()` with dynamic `import()` when the test also uses a statically imported class for `instanceof` or `toThrow` checks
- Don't use `vi.doMock()` inside individual tests when `vi.mock()` at top level achieves the same goal

---

**Keywords:** vitest, vi.resetModules, vi.doMock, dynamic import, instanceof, module identity, UserCancelledError, mock, toThrow

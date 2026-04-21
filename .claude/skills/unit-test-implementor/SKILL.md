---
name: unit-test-implementor
description: Patterns and conventions for writing *.test.ts files in this project. Load when creating or editing unit test files. Covers file placement, mock style, vitest imports, and case structure. Does NOT run ts_test_strategist — use procedures/test-unit.md for full agent-driven workflow.
paths:
  - src/**/*.test.ts
---

Test files live at `{dir}/__tests__/{stem}.test.ts` relative to the source file.

## Imports

Always import from vitest explicitly — no globals:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
```

Add `it.each` only when you use it:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
// it.each is on the it namespace — no extra import needed
```

## Mock style

**Interface mocks** (injected via constructor): declare at module scope as a typed object literal with `vi.fn()` values. Reset in `beforeEach` with `vi.clearAllMocks()`.

```ts
const mockRepo: ISessionRepository = {
  save: vi.fn(),
  load: vi.fn(),
  exists: vi.fn(),
}
```

**Module mocks** (external imports): use `vi.mock()` at the top level.

```ts
vi.mock('@src/lib/something', () => ({ doThing: vi.fn() }))
```

**No mocks needed**: pure functions with no injected deps — test directly.

## Class under test

Instantiate in `beforeEach`, never at module scope:

```ts
describe('SessionDomain', () => {
  let domain: SessionDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionDomain(mockRepo)
  })
})
```

## Case structure

- Order: happy path first, then branches, then error paths
- Describe block per class or function; nested `describe` for methods with multiple branches
- `it` descriptions: `'should <verb> <outcome>'` for behavior, or just `'<verb>s <outcome>'`
- Use `vi.mocked(mock.method).mockResolvedValue(...)` — not `(mock.method as vi.Mock)`

## Assertions

```ts
// async throws
await expect(fn()).rejects.toThrow(MyError)

// mock called with
expect(mock.save).toHaveBeenCalledWith(expected)

// exact call count
expect(mock.save).toHaveBeenCalledTimes(1)
```

## What NOT to do

- Never use `console.log` in tests
- Never import from `node_modules` internals
- Never test implementation details — test observable behavior
- Never duplicate tests already present in the file (read first if file exists)

## One assertion per `it`

Each `it` block must test exactly one input variant. Never bundle multiple `expect` calls for different inputs in a single `it` — a failure hides the remaining cases.

```ts
// BAD — three cases in one it
it('should throw for non-object inputs', () => {
  expect(() => parse(null)).toThrow(ValidationError)
  expect(() => parse('string')).toThrow(ValidationError)
  expect(() => parse(42)).toThrow(ValidationError)
})

// GOOD — one case each
it('should throw ValidationError when raw input is null', () => {
  expect(() => parse(null)).toThrow(ValidationError)
})
it('should throw ValidationError when raw input is a string', () => {
  expect(() => parse('string')).toThrow(ValidationError)
})
it('should throw ValidationError when raw input is a number', () => {
  expect(() => parse(42)).toThrow(ValidationError)
})
```

### Use `it.each` when only inputs differ

When ≥ 3 cases share the **same assertion shape** and differ only in the input value, replace the repeated `it` blocks with `it.each`. This keeps every case as a separate test run (satisfies the one-assertion rule) while reducing boilerplate.

**Conditions that must all hold:**
1. Same assertion (`toThrow(X)`, `toBe(y)`, etc.) across all rows
2. Same failure reason / same code path
3. ≥ 3 variants — two or fewer are clearer as explicit `it` blocks

```ts
// BEST — it.each for same-behavior error paths
it.each([
  ['null',     null],
  ['string',   'hello'],
  ['number',   42],
  ['boolean',  true],
] as const)('should throw ValidationError when raw input is %s', (_label, input) => {
  expect(() => parse(input)).toThrow(ValidationError)
})
```

**Do NOT use `it.each` for:**
- Happy-path cases where the expected output differs per row
- Cases that require different setup or mock behavior
- Cross-field logic (`superRefine`) where each combination has distinct semantics

Keep the label column (`_label`) as the first element so the generated test name is human-readable without encoding the raw value.

## Pipeline rejection protocol

Review agents signal failure via a temp file, not exit codes or stdout.

- The task field includes `ng_output_path: .claude/tmp/<task-name>` — the procedure writes plain-text feedback there **only on failure**.
- `PipelineService` checks `existsSync` after each agent run: file present → rejection (content becomes feedback, file deleted, engine jumps to rejection target); absent → pass.
- Always delete the file immediately after reading to prevent stale false rejections on retries.

## No redundant happy-path tests

A default-value assertion already present in an earlier `it` must not be repeated in a later one. Before adding a new happy-path test, scan the file for assertions that cover the same field and input.

## Cover all optional field types in error paths

For each optional field that has a type constraint (boolean, integer, enum…), add at least one negative test that passes the wrong type. 100 % line coverage does not guarantee this — a `stringRule` path inside `booleanRule` may be reachable only through a direct wrong-type call.

When a single field must reject multiple wrong types, use `it.each`:

```ts
it.each([
  ['string', 'yes'],
  ['number', 1],
  ['array',  []],
] as const)('should throw ValidationError when silentThoughts receives a %s', (_label, value) => {
  expect(() => parse({ ...minimal, silentThoughts: value })).toThrow(ValidationError)
})
```

For a single wrong-type case, a plain `it` is still fine:

```ts
it('should throw ValidationError when a boolean field receives a string', () => {
  expect(() => parse({ ...minimal, silentThoughts: 'yes' })).toThrow(ValidationError)
})
```

## Cover all schema-valid combinations in happy paths

When a schema has cross-field logic (e.g. `superRefine`), derive all valid filter combinations from the implementation and write a happy-path `it` for each. Missing a valid combination leaves a gap even at 100 % coverage.
